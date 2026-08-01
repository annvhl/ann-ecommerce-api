const { Pool } = require('pg');

// Neon requires SSL. The connection string itself lives only in .env
// (never committed to GitHub) and is read here via process.env.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
