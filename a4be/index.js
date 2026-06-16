const express = require("express");
const cors = require("cors");
const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const ID_PATTERN = /^\d{3}-\d{2}-\d{4}$/;
const STATE_PATTERN = /^[A-Za-z]{2}$/;
const ZIP_PATTERN = /^\d{5}$/;
const CITY_PATTERN = /^[\p{L}\s'.-]+$/u;

// Maximum lengths matching the authors table columns in the database.
const MAX_LENGTHS = {
  au_id: 11,
  au_lname: 40,
  au_fname: 20,
  phone: 12,
  address: 40,
  city: 20,
  state: 2,
  zip: 5,
};

/**
 * ======================================================================================================
 * DATABASE CONNECTION SETUP
 * ======================================================================================================
 
 */
const requiredEnvVars = ["DB_SERVER", "DB_DATABASE"];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;

let pool;
/**
 * ======================================================================================================
 * AUTHORS API ENDPOINTS
 * ======================================================================================================
 */
function isValidAuthorId(id) {
  return typeof id === "string" && ID_PATTERN.test(id.trim());
}

// Returns the au_id of an existing author with the same phone, excluding a given id.
async function findAuthorIdByPhone(phone, excludeId = null) {
  if (!phone) {
    return null;
  }

  const result = await pool.request()
    .input("phone", sql.Char(12), phone)
    .query('SELECT au_id FROM authors WHERE phone = @phone');

  const match = result.recordset.find(
    (row) => !excludeId || row.au_id.trim() !== excludeId.trim()
  );

  return match ? match.au_id.trim() : null;
}

function normalizeAuthorPayload(body) {
  return {
    au_id: typeof body.au_id === "string" ? body.au_id.trim() : "",
    au_lname: typeof body.au_lname === "string" ? body.au_lname.trim() : "",
    au_fname: typeof body.au_fname === "string" ? body.au_fname.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    address: typeof body.address === "string" ? body.address.trim() : "",
    city: typeof body.city === "string" ? body.city.trim() : "",
    state: typeof body.state === "string" ? body.state.trim().toUpperCase() : "",
    zip: typeof body.zip === "string" ? body.zip.trim() : "",
    contract: Boolean(body.contract),
  };
}

function validateAuthorPayload(author, options = { includeId: true }) {
  if (!author.au_lname || !author.au_fname) {
    return "au_lname and au_fname are required";
  }

  if (options.includeId && !isValidAuthorId(author.au_id)) {
    return "au_id is required and must match 123-45-6789";
  }

  if (author.state && !STATE_PATTERN.test(author.state)) {
    return "state must be 2 letters when provided";
  }

  if (author.city && !CITY_PATTERN.test(author.city)) {
    return "city must not contain numbers";
  }

  if (author.zip && !ZIP_PATTERN.test(author.zip)) {
    return "zip must be 5 digits when provided";
  }

  const tooLongField = Object.keys(MAX_LENGTHS).find(
    (field) => (author[field] || "").length > MAX_LENGTHS[field]
  );

  if (tooLongField) {
    return `${tooLongField} must be ${MAX_LENGTHS[tooLongField]} characters or fewer`;
  }

  return null;
}

// connect
async function connectToDatabase() {
  try {
    pool = await sql.connect({
      connectionString: connectionString,
      driver: "msnodesqlv8"
    });

    console.log("Connected to SQL Server LocalDB.");
  } catch (err) {
    console.error("Database connection failed:");
    console.error(err);
  }
}
connectToDatabase();


//test
app.get("/", (req, res) => {
  res.send("Pubs API is running");
});

// get all authors
app.get("/api/authors", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query('SELECT * FROM authors ORDER BY au_lname, au_fname');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching authors:', err);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

// get author by id
app.get("/api/authors/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    if (!isValidAuthorId(id)) {
      return res.status(400).json({ error: 'Invalid author id format. Expected 123-45-6789' });
    }
    const result = await pool.request().input("au_id", sql.VarChar(11), id).query('SELECT * FROM authors WHERE au_id = @au_id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Author not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching author:', err);
    res.status(500).json({ error: 'Failed to fetch author' });
  }
});

// generate unique author id
app.get("/api/authors/generate/id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    
    let uniqueId = null;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!uniqueId && attempts < maxAttempts) {
      const random1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const random2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const random3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const candidateId = `${random1}-${random2}-${random3}`;
      
      const result = await pool.request().input("au_id", sql.VarChar(11), candidateId).query('SELECT * FROM authors WHERE au_id = @au_id');
      if (result.recordset.length === 0) {
        uniqueId = candidateId;
      }
      attempts++;
    }
    
    if (!uniqueId) {
      return res.status(500).json({ error: 'Could not generate a unique author ID after multiple attempts' });
    }
    
    res.json({ au_id: uniqueId });
  } catch (err) {
    console.error('Error generating author id:', err);
    res.status(500).json({ error: 'Failed to generate author id' });
  }
});

// create a new author
app.post("/api/authors", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const author = normalizeAuthorPayload(req.body);
    const validationError = validateAuthorPayload(author, { includeId: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicatePhoneId = await findAuthorIdByPhone(author.phone);
    if (duplicatePhoneId) {
      return res.status(409).json({ error: 'This phone number is already used by another author.' });
    }

    await pool.request()
      .input("au_id", sql.VarChar(11), author.au_id)
      .input("au_lname", sql.VarChar(40), author.au_lname)
      .input("au_fname", sql.VarChar(20), author.au_fname)
      .input("phone", sql.Char(12), author.phone)
      .input("address", sql.VarChar(40), author.address)
      .input("city", sql.VarChar(20), author.city)
      .input("state", sql.Char(2), author.state)
      .input("zip", sql.Char(5), author.zip)
      .input("contract", sql.Bit, author.contract ? 1 : 0)
      .query('INSERT INTO authors (au_id, au_lname, au_fname, phone, address, city, state, zip, contract) VALUES (@au_id, @au_lname, @au_fname, @phone, @address, @city, @state, @zip, @contract)');
    res.status(201).json({ message: 'Author created successfully' });
  } catch (err) {
    console.error('Error creating author:', err);
    res.status(500).json({ error: 'Failed to create author' });
  }
});

// update an author
app.put("/api/authors/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    if (!isValidAuthorId(id)) {
      return res.status(400).json({ error: 'Invalid author id format. Expected 123-45-6789' });
    }

    const author = normalizeAuthorPayload({ ...req.body, au_id: id });
    const validationError = validateAuthorPayload(author, { includeId: false });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicatePhoneId = await findAuthorIdByPhone(author.phone, id);
    if (duplicatePhoneId) {
      return res.status(409).json({ error: 'This phone number is already used by another author.' });
    }

    const result = await pool.request()
      .input("au_id", sql.VarChar(11), id)
      .input("au_lname", sql.VarChar(40), author.au_lname)
      .input("au_fname", sql.VarChar(20), author.au_fname)
      .input("phone", sql.Char(12), author.phone)
      .input("address", sql.VarChar(40), author.address)
      .input("city", sql.VarChar(20), author.city)
      .input("state", sql.Char(2), author.state)
      .input("zip", sql.Char(5), author.zip)
      .input("contract", sql.Bit, author.contract ? 1 : 0)
      .query('UPDATE authors SET au_lname = @au_lname, au_fname = @au_fname, phone = @phone, address = @address, city = @city, state = @state, zip = @zip, contract = @contract WHERE au_id = @au_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Author not found' });
    }
    res.json({ message: 'Author updated successfully' });
  } catch (err) {
    console.error('Error updating author:', err);
    res.status(500).json({ error: 'Failed to update author' });
  }
});

// delete an author
app.delete("/api/authors/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    if (!isValidAuthorId(id)) {
      return res.status(400).json({ error: 'Invalid author id format. Expected 123-45-6789' });
    }
    const result = await pool.request().input("au_id", sql.VarChar(11), id).query('DELETE FROM authors WHERE au_id = @au_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Author not found' });
    }
    res.json({ message: 'Author deleted successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      console.warn(`Delete blocked for author ${req.params.id}: linked to one or more books.`);
      return res.status(409).json({ error: 'Cannot delete this author because they are linked to one or more books.' });
    }
    console.error('Error deleting author:', err);
    res.status(500).json({ error: 'Failed to delete author' });
  }
});

// ---------------------------------------------------------------------------
// Publishers
// ---------------------------------------------------------------------------

// New publisher ids must satisfy the pubs CHECK constraint: 99[0-9][0-9].
const PUB_ID_PATTERN = /^99\d{2}$/;

const PUBLISHER_MAX_LENGTHS = {
  pub_id: 4,
  pub_name: 40,
  city: 20,
  state: 2,
  country: 30,
};

function isValidPublisherId(id) {
  return typeof id === "string" && PUB_ID_PATTERN.test(id.trim());
}

function normalizePublisherPayload(body) {
  return {
    pub_id: typeof body.pub_id === "string" ? body.pub_id.trim() : "",
    pub_name: typeof body.pub_name === "string" ? body.pub_name.trim() : "",
    city: typeof body.city === "string" ? body.city.trim() : "",
    state: typeof body.state === "string" ? body.state.trim().toUpperCase() : "",
    country: typeof body.country === "string" ? body.country.trim() : "",
  };
}

function validatePublisherPayload(publisher, options = { includeId: true }) {
  if (!publisher.pub_name) {
    return "pub_name is required";
  }

  if (options.includeId && !isValidPublisherId(publisher.pub_id)) {
    return "pub_id is required and must match 99## (for example 9999)";
  }

  if (publisher.state && !STATE_PATTERN.test(publisher.state)) {
    return "state must be 2 letters when provided";
  }

  if (publisher.city && !CITY_PATTERN.test(publisher.city)) {
    return "city must not contain numbers";
  }

  const tooLongField = Object.keys(PUBLISHER_MAX_LENGTHS).find(
    (field) => (publisher[field] || "").length > PUBLISHER_MAX_LENGTHS[field]
  );

  if (tooLongField) {
    return `${tooLongField} must be ${PUBLISHER_MAX_LENGTHS[tooLongField]} characters or fewer`;
  }

  return null;
}

// Returns the pub_id of an existing publisher with the same name, excluding a given id.
async function findPublisherIdByName(pubName, excludeId = null) {
  if (!pubName) {
    return null;
  }

  const result = await pool.request()
    .input("pub_name", sql.VarChar(40), pubName)
    .query('SELECT pub_id FROM publishers WHERE pub_name = @pub_name');

  const match = result.recordset.find(
    (row) => !excludeId || row.pub_id.trim() !== excludeId.trim()
  );

  return match ? match.pub_id.trim() : null;
}

// get all publishers
app.get("/api/publishers", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query('SELECT * FROM publishers ORDER BY pub_name');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching publishers:', err);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

// generate unique publisher id (must match 99## per the pubs CHECK constraint)
app.get("/api/publishers/generate/id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    let uniqueId = null;
    let attempts = 0;
    const maxAttempts = 100;

    while (!uniqueId && attempts < maxAttempts) {
      const candidateId = `99${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      const result = await pool.request().input("pub_id", sql.VarChar(4), candidateId).query('SELECT pub_id FROM publishers WHERE pub_id = @pub_id');
      if (result.recordset.length === 0) {
        uniqueId = candidateId;
      }
      attempts++;
    }

    if (!uniqueId) {
      return res.status(500).json({ error: 'Could not generate a unique publisher ID after multiple attempts' });
    }

    res.json({ pub_id: uniqueId });
  } catch (err) {
    console.error('Error generating publisher id:', err);
    res.status(500).json({ error: 'Failed to generate publisher id' });
  }
});

// get publisher by id
app.get("/api/publishers/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const result = await pool.request().input("pub_id", sql.VarChar(4), id).query('SELECT * FROM publishers WHERE pub_id = @pub_id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching publisher:', err);
    res.status(500).json({ error: 'Failed to fetch publisher' });
  }
});

// create a new publisher
app.post("/api/publishers", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const publisher = normalizePublisherPayload(req.body);
    const validationError = validatePublisherPayload(publisher, { includeId: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicateNameId = await findPublisherIdByName(publisher.pub_name);
    if (duplicateNameId) {
      return res.status(409).json({ error: 'This publisher name is already used by another publisher.' });
    }

    await pool.request()
      .input("pub_id", sql.VarChar(4), publisher.pub_id)
      .input("pub_name", sql.VarChar(40), publisher.pub_name)
      .input("city", sql.VarChar(20), publisher.city)
      .input("state", sql.Char(2), publisher.state)
      .input("country", sql.VarChar(30), publisher.country)
      .query('INSERT INTO publishers (pub_id, pub_name, city, state, country) VALUES (@pub_id, @pub_name, @city, @state, @country)');
    res.status(201).json({ message: 'Publisher created successfully' });
  } catch (err) {
    console.error('Error creating publisher:', err);
    res.status(500).json({ error: 'Failed to create publisher' });
  }
});

// update a publisher
app.put("/api/publishers/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const publisher = normalizePublisherPayload({ ...req.body, pub_id: id });
    const validationError = validatePublisherPayload(publisher, { includeId: false });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicateNameId = await findPublisherIdByName(publisher.pub_name, id);
    if (duplicateNameId) {
      return res.status(409).json({ error: 'This publisher name is already used by another publisher.' });
    }

    const result = await pool.request()
      .input("pub_id", sql.VarChar(4), id)
      .input("pub_name", sql.VarChar(40), publisher.pub_name)
      .input("city", sql.VarChar(20), publisher.city)
      .input("state", sql.Char(2), publisher.state)
      .input("country", sql.VarChar(30), publisher.country)
      .query('UPDATE publishers SET pub_name = @pub_name, city = @city, state = @state, country = @country WHERE pub_id = @pub_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }
    res.json({ message: 'Publisher updated successfully' });
  } catch (err) {
    console.error('Error updating publisher:', err);
    res.status(500).json({ error: 'Failed to update publisher' });
  }
});

// delete a publisher
app.delete("/api/publishers/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const result = await pool.request().input("pub_id", sql.VarChar(4), id).query('DELETE FROM publishers WHERE pub_id = @pub_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }
    res.json({ message: 'Publisher deleted successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      console.warn(`Delete blocked for publisher ${req.params.id}: linked to titles or employees.`);
      return res.status(409).json({ error: 'Cannot delete this publisher because it is linked to one or more titles or employees.' });
    }
    console.error('Error deleting publisher:', err);
    res.status(500).json({ error: 'Failed to delete publisher' });
  }
});

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function normalizeJobPayload(body) {
  return {
    job_desc: typeof body.job_desc === "string" ? body.job_desc.trim() : "",
    min_lvl: Number(body.min_lvl),
    max_lvl: Number(body.max_lvl),
  };
}

function validateJobPayload(job) {
  if (!job.job_desc) {
    return "job_desc is required";
  }

  if (job.job_desc.length > 50) {
    return "job_desc must be 50 characters or fewer";
  }

  if (!Number.isInteger(job.min_lvl) || job.min_lvl < 10 || job.min_lvl > 250) {
    return "min_lvl must be a whole number between 10 and 250";
  }

  if (!Number.isInteger(job.max_lvl) || job.max_lvl < 10 || job.max_lvl > 250) {
    return "max_lvl must be a whole number between 10 and 250";
  }

  if (job.min_lvl > job.max_lvl) {
    return "min_lvl cannot be greater than max_lvl";
  }

  return null;
}

// get all jobs
app.get("/api/jobs", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query('SELECT job_id, job_desc, min_lvl, max_lvl FROM jobs ORDER BY job_desc');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// get job by id
app.get("/api/jobs/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid job id' });
    }
    const result = await pool.request().input("job_id", sql.SmallInt, id).query('SELECT job_id, job_desc, min_lvl, max_lvl FROM jobs WHERE job_id = @job_id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// create a new job (job_id is an identity column, generated by the database)
app.post("/api/jobs", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const job = normalizeJobPayload(req.body);
    const validationError = validateJobPayload(job);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await pool.request()
      .input("job_desc", sql.VarChar(50), job.job_desc)
      .input("min_lvl", sql.TinyInt, job.min_lvl)
      .input("max_lvl", sql.TinyInt, job.max_lvl)
      .query('INSERT INTO jobs (job_desc, min_lvl, max_lvl) OUTPUT INSERTED.job_id VALUES (@job_desc, @min_lvl, @max_lvl)');
    res.status(201).json({ message: 'Job created successfully', job_id: result.recordset[0].job_id });
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// update a job
app.put("/api/jobs/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid job id' });
    }
    const job = normalizeJobPayload(req.body);
    const validationError = validateJobPayload(job);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await pool.request()
      .input("job_id", sql.SmallInt, id)
      .input("job_desc", sql.VarChar(50), job.job_desc)
      .input("min_lvl", sql.TinyInt, job.min_lvl)
      .input("max_lvl", sql.TinyInt, job.max_lvl)
      .query('UPDATE jobs SET job_desc = @job_desc, min_lvl = @min_lvl, max_lvl = @max_lvl WHERE job_id = @job_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job updated successfully' });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// delete a job
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid job id' });
    }
    const result = await pool.request().input("job_id", sql.SmallInt, id).query('DELETE FROM jobs WHERE job_id = @job_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      console.warn(`Delete blocked for job ${req.params.id}: linked to employees.`);
      return res.status(409).json({ error: 'Cannot delete this job because it is assigned to one or more employees.' });
    }
    console.error('Error deleting job:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ---------------------------------------------------------------------------
// Stores (read-only lookup, used to populate the sales store dropdown)
// ---------------------------------------------------------------------------

app.get("/api/stores", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query('SELECT stor_id, stor_name FROM stores ORDER BY stor_name');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching stores:', err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------

const TITLE_ID_PATTERN = /^[A-Za-z]{2}\d{4}$/;

function isValidTitleId(id) {
  return typeof id === "string" && TITLE_ID_PATTERN.test(id.trim());
}

function normalizeTitlePayload(body) {
  const price = body.price === "" || body.price === null || body.price === undefined ? null : Number(body.price);
  const advance = body.advance === "" || body.advance === null || body.advance === undefined ? null : Number(body.advance);
  const royalty = body.royalty === "" || body.royalty === null || body.royalty === undefined ? null : Number(body.royalty);
  const ytd_sales = body.ytd_sales === "" || body.ytd_sales === null || body.ytd_sales === undefined ? null : Number(body.ytd_sales);

  return {
    title_id: typeof body.title_id === "string" ? body.title_id.trim().toUpperCase() : "",
    title: typeof body.title === "string" ? body.title.trim() : "",
    type: typeof body.type === "string" && body.type.trim() ? body.type.trim() : "UNDECIDED",
    pub_id: typeof body.pub_id === "string" && body.pub_id.trim() ? body.pub_id.trim() : null,
    price,
    advance,
    royalty,
    ytd_sales,
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    pubdate: body.pubdate ? new Date(body.pubdate) : new Date(),
  };
}

function validateTitlePayload(title, options = { includeId: true }) {
  if (options.includeId && !isValidTitleId(title.title_id)) {
    return "title_id is required and must be 2 letters followed by 4 digits (for example BU1032)";
  }

  if (!title.title) {
    return "title is required";
  }

  if (title.title.length > 80) {
    return "title must be 80 characters or fewer";
  }

  if (title.type && title.type.length > 12) {
    return "type must be 12 characters or fewer";
  }

  for (const field of ["price", "advance", "royalty", "ytd_sales"]) {
    if (title[field] !== null && (Number.isNaN(title[field]) || title[field] < 0)) {
      return `${field} must be a non-negative number when provided`;
    }
  }

  if (title.notes && title.notes.length > 200) {
    return "notes must be 200 characters or fewer";
  }

  if (Number.isNaN(title.pubdate.getTime())) {
    return "pubdate must be a valid date";
  }

  return null;
}

function bindTitleInputs(request, title) {
  return request
    .input("title", sql.VarChar(80), title.title)
    .input("type", sql.Char(12), title.type)
    .input("pub_id", sql.Char(4), title.pub_id)
    .input("price", sql.Money, title.price)
    .input("advance", sql.Money, title.advance)
    .input("royalty", sql.Int, title.royalty)
    .input("ytd_sales", sql.Int, title.ytd_sales)
    .input("notes", sql.VarChar(200), title.notes || null)
    .input("pubdate", sql.DateTime, title.pubdate);
}

// get all titles (joined with publisher name for display)
app.get("/api/titles", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query(`
      SELECT t.title_id, t.title, t.type, t.pub_id, p.pub_name, t.price, t.advance, t.royalty, t.ytd_sales, t.notes, t.pubdate
      FROM titles t
      LEFT JOIN publishers p ON t.pub_id = p.pub_id
      ORDER BY t.title`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching titles:', err);
    res.status(500).json({ error: 'Failed to fetch titles' });
  }
});

// generate unique title id (2 letters + 4 digits)
app.get("/api/titles/generate/id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let uniqueId = null;
    let attempts = 0;
    const maxAttempts = 100;

    while (!uniqueId && attempts < maxAttempts) {
      const prefix = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
      const digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const candidateId = `${prefix}${digits}`;
      const result = await pool.request().input("title_id", sql.VarChar(6), candidateId).query('SELECT title_id FROM titles WHERE title_id = @title_id');
      if (result.recordset.length === 0) {
        uniqueId = candidateId;
      }
      attempts++;
    }

    if (!uniqueId) {
      return res.status(500).json({ error: 'Could not generate a unique title ID after multiple attempts' });
    }

    res.json({ title_id: uniqueId });
  } catch (err) {
    console.error('Error generating title id:', err);
    res.status(500).json({ error: 'Failed to generate title id' });
  }
});

// get title by id
app.get("/api/titles/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const result = await pool.request().input("title_id", sql.VarChar(6), id).query('SELECT title_id, title, type, pub_id, price, advance, royalty, ytd_sales, notes, pubdate FROM titles WHERE title_id = @title_id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Title not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching title:', err);
    res.status(500).json({ error: 'Failed to fetch title' });
  }
});

// create a new title
app.post("/api/titles", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const title = normalizeTitlePayload(req.body);
    const validationError = validateTitlePayload(title, { includeId: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const request = bindTitleInputs(pool.request().input("title_id", sql.VarChar(6), title.title_id), title);
    await request.query('INSERT INTO titles (title_id, title, type, pub_id, price, advance, royalty, ytd_sales, notes, pubdate) VALUES (@title_id, @title, @type, @pub_id, @price, @advance, @royalty, @ytd_sales, @notes, @pubdate)');
    res.status(201).json({ message: 'Title created successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(400).json({ error: 'The selected publisher does not exist.' });
    }
    console.error('Error creating title:', err);
    res.status(500).json({ error: 'Failed to create title' });
  }
});

// update a title
app.put("/api/titles/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const title = normalizeTitlePayload({ ...req.body, title_id: id });
    const validationError = validateTitlePayload(title, { includeId: false });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const request = bindTitleInputs(pool.request().input("title_id", sql.VarChar(6), id), title);
    const result = await request.query('UPDATE titles SET title = @title, type = @type, pub_id = @pub_id, price = @price, advance = @advance, royalty = @royalty, ytd_sales = @ytd_sales, notes = @notes, pubdate = @pubdate WHERE title_id = @title_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Title not found' });
    }
    res.json({ message: 'Title updated successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(400).json({ error: 'The selected publisher does not exist.' });
    }
    console.error('Error updating title:', err);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// delete a title
app.delete("/api/titles/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const result = await pool.request().input("title_id", sql.VarChar(6), id).query('DELETE FROM titles WHERE title_id = @title_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Title not found' });
    }
    res.json({ message: 'Title deleted successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      console.warn(`Delete blocked for title ${req.params.id}: linked to sales or other records.`);
      return res.status(409).json({ error: 'Cannot delete this title because it is linked to sales or author records.' });
    }
    console.error('Error deleting title:', err);
    res.status(500).json({ error: 'Failed to delete title' });
  }
});

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

// emp_id CHECK: [A-Z][A-Z][A-Z][1-9][0-9][0-9][0-9][0-9][FM]  OR  [A-Z]-[A-Z][1-9][0-9][0-9][0-9][0-9][FM]
const EMP_ID_PATTERN = /^([A-Za-z]{3}[1-9]\d{4}[FMfm]|[A-Za-z]-[A-Za-z][1-9]\d{4}[FMfm])$/;
const EMP_NAME_PATTERN = /^[A-Za-z\s'.-]+$/;

function isValidEmployeeId(id) {
  return typeof id === "string" && EMP_ID_PATTERN.test(id.trim());
}

function normalizeEmployeePayload(body) {
  return {
    emp_id: typeof body.emp_id === "string" ? body.emp_id.trim().toUpperCase() : "",
    fname: typeof body.fname === "string" ? body.fname.trim() : "",
    minit: typeof body.minit === "string" ? body.minit.trim().toUpperCase() : "",
    lname: typeof body.lname === "string" ? body.lname.trim() : "",
    job_id: Number(body.job_id),
    job_lvl: body.job_lvl === "" || body.job_lvl === null || body.job_lvl === undefined ? null : Number(body.job_lvl),
    pub_id: typeof body.pub_id === "string" ? body.pub_id.trim() : "",
    hire_date: body.hire_date ? new Date(body.hire_date) : new Date(),
  };
}

function validateEmployeePayload(employee, options = { includeId: true }) {
  if (options.includeId && !isValidEmployeeId(employee.emp_id)) {
    return "emp_id is required and must be 3 letters, 5 digits, then F or M (for example PMA42628M)";
  }

  if (!employee.fname || !EMP_NAME_PATTERN.test(employee.fname)) {
    return "fname is required and must contain letters only";
  }

  if (employee.fname.length > 20) {
    return "fname must be 20 characters or fewer";
  }

  if (employee.minit && employee.minit.length > 1) {
    return "minit must be a single letter";
  }

  if (!employee.lname || !EMP_NAME_PATTERN.test(employee.lname)) {
    return "lname is required and must contain letters only";
  }

  if (employee.lname.length > 30) {
    return "lname must be 30 characters or fewer";
  }

  if (!Number.isInteger(employee.job_id) || employee.job_id <= 0) {
    return "a job must be selected";
  }

  if (employee.job_lvl !== null && (!Number.isInteger(employee.job_lvl) || employee.job_lvl < 0 || employee.job_lvl > 255)) {
    return "job_lvl must be a whole number between 0 and 255 when provided";
  }

  if (!employee.pub_id) {
    return "a publisher must be selected";
  }

  if (Number.isNaN(employee.hire_date.getTime())) {
    return "hire_date must be a valid date";
  }

  return null;
}

function bindEmployeeInputs(request, employee) {
  return request
    .input("fname", sql.VarChar(20), employee.fname)
    .input("minit", sql.Char(1), employee.minit || null)
    .input("lname", sql.VarChar(30), employee.lname)
    .input("job_id", sql.SmallInt, employee.job_id)
    .input("job_lvl", sql.TinyInt, employee.job_lvl)
    .input("pub_id", sql.Char(4), employee.pub_id)
    .input("hire_date", sql.DateTime, employee.hire_date);
}

// get all employees (joined with job description and publisher name)
app.get("/api/employees", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query(`
      SELECT e.emp_id, e.fname, e.minit, e.lname, e.job_id, j.job_desc, e.job_lvl, e.pub_id, p.pub_name, e.hire_date
      FROM employee e
      LEFT JOIN jobs j ON e.job_id = j.job_id
      LEFT JOIN publishers p ON e.pub_id = p.pub_id
      ORDER BY e.lname, e.fname`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// generate unique employee id (3 letters + 5 digits + F/M)
app.get("/api/employees/generate/id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randLetter = () => letters[Math.floor(Math.random() * 26)];
    let uniqueId = null;
    let attempts = 0;
    const maxAttempts = 100;

    while (!uniqueId && attempts < maxAttempts) {
      const prefix = randLetter() + randLetter() + randLetter();
      const firstDigit = Math.floor(Math.random() * 9) + 1;
      const rest = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const gender = Math.random() < 0.5 ? 'F' : 'M';
      const candidateId = `${prefix}${firstDigit}${rest}${gender}`;
      const result = await pool.request().input("emp_id", sql.Char(9), candidateId).query('SELECT emp_id FROM employee WHERE emp_id = @emp_id');
      if (result.recordset.length === 0) {
        uniqueId = candidateId;
      }
      attempts++;
    }

    if (!uniqueId) {
      return res.status(500).json({ error: 'Could not generate a unique employee ID after multiple attempts' });
    }

    res.json({ emp_id: uniqueId });
  } catch (err) {
    console.error('Error generating employee id:', err);
    res.status(500).json({ error: 'Failed to generate employee id' });
  }
});

// get employee by id
app.get("/api/employees/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const result = await pool.request().input("emp_id", sql.Char(9), id).query('SELECT emp_id, fname, minit, lname, job_id, job_lvl, pub_id, hire_date FROM employee WHERE emp_id = @emp_id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// create a new employee
app.post("/api/employees", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const employee = normalizeEmployeePayload(req.body);
    const validationError = validateEmployeePayload(employee, { includeId: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const request = bindEmployeeInputs(pool.request().input("emp_id", sql.Char(9), employee.emp_id), employee);
    await request.query('INSERT INTO employee (emp_id, fname, minit, lname, job_id, job_lvl, pub_id, hire_date) VALUES (@emp_id, @fname, @minit, @lname, @job_id, @job_lvl, @pub_id, @hire_date)');
    res.status(201).json({ message: 'Employee created successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(400).json({ error: 'The selected job or publisher does not exist, or a value violates a database rule.' });
    }
    console.error('Error creating employee:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// update an employee
app.put("/api/employees/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const employee = normalizeEmployeePayload({ ...req.body, emp_id: id });
    const validationError = validateEmployeePayload(employee, { includeId: false });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const request = bindEmployeeInputs(pool.request().input("emp_id", sql.Char(9), id), employee);
    const result = await request.query('UPDATE employee SET fname = @fname, minit = @minit, lname = @lname, job_id = @job_id, job_lvl = @job_lvl, pub_id = @pub_id, hire_date = @hire_date WHERE emp_id = @emp_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(400).json({ error: 'The selected job or publisher does not exist, or a value violates a database rule.' });
    }
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// delete an employee
app.delete("/api/employees/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const result = await pool.request().input("emp_id", sql.Char(9), id).query('DELETE FROM employee WHERE emp_id = @emp_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      console.warn(`Delete blocked for employee ${req.params.id}: linked to other records.`);
      return res.status(409).json({ error: 'Cannot delete this employee because they are linked to one or more records.' });
    }
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ---------------------------------------------------------------------------
// Sales (composite primary key: stor_id + ord_num)
// ---------------------------------------------------------------------------

function normalizeSalePayload(body) {
  return {
    stor_id: typeof body.stor_id === "string" ? body.stor_id.trim() : "",
    ord_num: typeof body.ord_num === "string" ? body.ord_num.trim() : "",
    ord_date: body.ord_date ? new Date(body.ord_date) : new Date(),
    qty: Number(body.qty),
    payterms: typeof body.payterms === "string" ? body.payterms.trim() : "",
    title_id: typeof body.title_id === "string" ? body.title_id.trim() : "",
  };
}

function validateSalePayload(sale, options = { includeKey: true }) {
  if (options.includeKey && !sale.stor_id) {
    return "a store must be selected";
  }

  if (options.includeKey && !sale.ord_num) {
    return "ord_num is required";
  }

  if (sale.ord_num.length > 20) {
    return "ord_num must be 20 characters or fewer";
  }

  if (Number.isNaN(sale.ord_date.getTime())) {
    return "ord_date must be a valid date";
  }

  if (!Number.isInteger(sale.qty) || sale.qty <= 0) {
    return "qty must be a whole number greater than zero";
  }

  if (!sale.payterms) {
    return "payterms is required";
  }

  if (sale.payterms.length > 12) {
    return "payterms must be 12 characters or fewer";
  }

  if (!sale.title_id) {
    return "a title must be selected";
  }

  return null;
}

// get all sales (joined with store name and title)
app.get("/api/sales", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request().query(`
      SELECT s.stor_id, st.stor_name, s.ord_num, s.ord_date, s.qty, s.payterms, s.title_id, t.title
      FROM sales s
      LEFT JOIN stores st ON s.stor_id = st.stor_id
      LEFT JOIN titles t ON s.title_id = t.title_id
      ORDER BY s.ord_date DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// get sale by composite key
app.get("/api/sales/:storId/:ordNum", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request()
      .input("stor_id", sql.Char(4), req.params.storId)
      .input("ord_num", sql.VarChar(20), req.params.ordNum)
      .query('SELECT stor_id, ord_num, ord_date, qty, payterms, title_id FROM sales WHERE stor_id = @stor_id AND ord_num = @ord_num');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching sale:', err);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// create a new sale
app.post("/api/sales", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const sale = normalizeSalePayload(req.body);
    const validationError = validateSalePayload(sale, { includeKey: true });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existing = await pool.request()
      .input("stor_id", sql.Char(4), sale.stor_id)
      .input("ord_num", sql.VarChar(20), sale.ord_num)
      .query('SELECT 1 FROM sales WHERE stor_id = @stor_id AND ord_num = @ord_num');
    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'A sale with this store and order number already exists.' });
    }

    await pool.request()
      .input("stor_id", sql.Char(4), sale.stor_id)
      .input("ord_num", sql.VarChar(20), sale.ord_num)
      .input("ord_date", sql.DateTime, sale.ord_date)
      .input("qty", sql.SmallInt, sale.qty)
      .input("payterms", sql.VarChar(12), sale.payterms)
      .input("title_id", sql.VarChar(6), sale.title_id)
      .query('INSERT INTO sales (stor_id, ord_num, ord_date, qty, payterms, title_id) VALUES (@stor_id, @ord_num, @ord_date, @qty, @payterms, @title_id)');
    res.status(201).json({ message: 'Sale created successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(400).json({ error: 'The selected store or title does not exist.' });
    }
    console.error('Error creating sale:', err);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// update a sale (store + order number identify the row and are not changed)
app.put("/api/sales/:storId/:ordNum", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const sale = normalizeSalePayload({ ...req.body, stor_id: req.params.storId, ord_num: req.params.ordNum });
    const validationError = validateSalePayload(sale, { includeKey: false });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await pool.request()
      .input("stor_id", sql.Char(4), req.params.storId)
      .input("ord_num", sql.VarChar(20), req.params.ordNum)
      .input("ord_date", sql.DateTime, sale.ord_date)
      .input("qty", sql.SmallInt, sale.qty)
      .input("payterms", sql.VarChar(12), sale.payterms)
      .input("title_id", sql.VarChar(6), sale.title_id)
      .query('UPDATE sales SET ord_date = @ord_date, qty = @qty, payterms = @payterms, title_id = @title_id WHERE stor_id = @stor_id AND ord_num = @ord_num');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ message: 'Sale updated successfully' });
  } catch (err) {
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(400).json({ error: 'The selected title does not exist.' });
    }
    console.error('Error updating sale:', err);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

// delete a sale
app.delete("/api/sales/:storId/:ordNum", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const result = await pool.request()
      .input("stor_id", sql.Char(4), req.params.storId)
      .input("ord_num", sql.VarChar(20), req.params.ordNum)
      .query('DELETE FROM sales WHERE stor_id = @stor_id AND ord_num = @ord_num');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ message: 'Sale deleted successfully' });
  } catch (err) {
    console.error('Error deleting sale:', err);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});