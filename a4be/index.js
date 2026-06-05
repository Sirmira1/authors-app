const express = require("express");
const cors = require("cors");
const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;

let pool;

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

// create a new author
app.post("/api/authors", async (req, res) => {
  try {    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }
    const { au_id, au_lname, au_fname, phone, address, city, state, zip, contract } = req.body;
    if (!au_id || !au_lname || !au_fname) {
      return res.status(400).json({ error: 'au_id, au_lname, and au_fname are required' });
    }
    await pool.request()
      .input("au_id", sql.VarChar(11), au_id)
      .input("au_lname", sql.VarChar(40), au_lname)
      .input("au_fname", sql.VarChar(40), au_fname)
      .input("phone", sql.Char(12), phone)
      .input("address", sql.VarChar(60), address)
      .input("city", sql.VarChar(30), city)
      .input("state", sql.Char(2), state)
      .input("zip", sql.Char(10), zip)
      .input("contract", sql.Bit, contract ? 1 : 0)
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
    if (!pool) {    return res.status(500).json({ error: 'Database connection not established' });
    }
    const id = req.params.id;
    const { au_lname, au_fname, phone, address, city, state, zip, contract } = req.body;
    if (!au_lname || !au_fname) {
      return res.status(400).json({ error: 'au_lname and au_fname are required' });
    }
    const result = await pool.request()
      .input("au_id", sql.VarChar(11), id)
      .input("au_lname", sql.VarChar(40), au_lname)
      .input("au_fname", sql.VarChar(40), au_fname)
      .input("phone", sql.Char(12), phone)
      .input("address", sql.VarChar(60), address)
      .input("city", sql.VarChar(30), city)
      .input("state", sql.Char(2), state)
      .input("zip", sql.Char(10), zip)
      .input("contract", sql.Bit, contract ? 1 : 0)
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
    const result = await pool.request().input("au_id", sql.VarChar(11), id).query('DELETE FROM authors WHERE au_id = @au_id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Author not found' });
    }
    res.json({ message: 'Author deleted successfully' });
  } catch (err) {
    console.error('Error deleting author:', err);
    res.status(500).json({ error: 'Failed to delete author' });
  }
});

// start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});