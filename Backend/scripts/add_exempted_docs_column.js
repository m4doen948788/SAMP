const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    console.log('Adding exempted_docs column to kegiatan_manajemen...');
    await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN exempted_docs TEXT DEFAULT NULL AFTER keterangan');
    console.log('Column exempted_docs added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add column:', err.message);
    process.exit(1);
  }
}

run();
