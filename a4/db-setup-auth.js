/**
 * One-time setup for employee authentication.
 *
 * WHAT THIS DOES (database layer):
 *   1. Adds a `password_hash` column to the existing `employee` table.
 *      We never store raw passwords. bcrypt turns "Manager123!" into a long
 *      one-way hash. Logging in re-hashes what you typed and compares.
 *   2. Seeds a default password for EVERY employee so any emp_id can log in
 *      during testing. (In a real system each person would set their own.)
 *
 * SAFE TO RE-RUN: it checks whether the column exists first, and only sets a
 * password where one is missing, so running it twice does no harm.
 *
 * Run with:  node db-setup-auth.js
 */
const sql = require('mssql/msnodesqlv8');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Every seeded employee gets this password. Change it if you like.
const DEFAULT_PASSWORD = 'Pubs123!';

const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;

async function main() {
  const pool = await sql.connect({ connectionString, driver: 'msnodesqlv8' });
  console.log('Connected.');

  // 1. Add the column only if it does not already exist (idempotent).
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.employee') AND name = 'password_hash'
    )
    BEGIN
      ALTER TABLE dbo.employee ADD password_hash VARCHAR(255) NULL;
    END
  `);
  console.log('Column password_hash ensured.');

  // 2. Hash the shared default password once, then apply to all rows missing one.
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const result = await pool.request()
    .input('hash', sql.VarChar(255), hash)
    .query('UPDATE employee SET password_hash = @hash WHERE password_hash IS NULL');
  console.log(`Seeded password for ${result.rowsAffected[0]} employee(s).`);

  // Show a couple of management logins to test with.
  const sample = await pool.request().query(`
    SELECT TOP 5 e.emp_id, e.fname, e.lname, e.job_id, j.job_desc
    FROM employee e LEFT JOIN jobs j ON e.job_id = j.job_id
    WHERE e.job_id BETWEEN 2 AND 11
    ORDER BY e.job_id`);
  console.log('\nManagement accounts you can log in with (password = ' + DEFAULT_PASSWORD + '):');
  sample.recordset.forEach(r => console.log(`  ${r.emp_id}  ${r.fname} ${r.lname}  (${r.job_desc})`));

  const nonMgmt = await pool.request().query(`
    SELECT TOP 2 e.emp_id, e.fname, e.lname, j.job_desc
    FROM employee e LEFT JOIN jobs j ON e.job_id = j.job_id
    WHERE e.job_id NOT BETWEEN 2 AND 11
    ORDER BY e.job_id`);
  console.log('\nNon-management accounts (should be BLOCKED from Employees/Jobs):');
  nonMgmt.recordset.forEach(r => console.log(`  ${r.emp_id}  ${r.fname} ${r.lname}  (${r.job_desc})`));

  process.exit(0);
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
