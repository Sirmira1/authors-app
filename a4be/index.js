const express = require("express");
const cors = require("cors");
const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const ID_PATTERN = /^\d{3}-\d{2}-\d{4}$/;
const STATE_PATTERN = /^[A-Za-z]{2}$/;
const ZIP_PATTERN = /^\d{5}$/;

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

function isValidAuthorId(id) {
  return typeof id === "string" && ID_PATTERN.test(id.trim());
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

  if (author.zip && !ZIP_PATTERN.test(author.zip)) {
    return "zip must be 5 digits when provided";
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
    await pool.request()
      .input("au_id", sql.VarChar(11), author.au_id)
      .input("au_lname", sql.VarChar(40), author.au_lname)
      .input("au_fname", sql.VarChar(40), author.au_fname)
      .input("phone", sql.Char(12), author.phone)
      .input("address", sql.VarChar(60), author.address)
      .input("city", sql.VarChar(30), author.city)
      .input("state", sql.Char(2), author.state)
      .input("zip", sql.Char(10), author.zip)
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

    const result = await pool.request()
      .input("au_id", sql.VarChar(11), id)
      .input("au_lname", sql.VarChar(40), author.au_lname)
      .input("au_fname", sql.VarChar(40), author.au_fname)
      .input("phone", sql.Char(12), author.phone)
      .input("address", sql.VarChar(60), author.address)
      .input("city", sql.VarChar(30), author.city)
      .input("state", sql.Char(2), author.state)
      .input("zip", sql.Char(10), author.zip)
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
    console.error('Error deleting author:', err);
    if (err?.number === 547 || err?.originalError?.info?.number === 547) {
      return res.status(409).json({ error: 'Cannot delete this author because they are linked to one or more books.' });
    }
    res.status(500).json({ error: 'Failed to delete author' });
  }
});

// start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});