const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log("Checking kegiatan_manajemen columns for exempted_docs...");
    const [cols] = await pool.query('SHOW COLUMNS FROM kegiatan_manajemen');
    const hasExemptedDocs = cols.some(c => c.Field === 'exempted_docs');

    if (!hasExemptedDocs) {
      console.log("Adding exempted_docs column...");
      await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN exempted_docs TEXT DEFAULT NULL AFTER keterangan');
      console.log("Column exempted_docs added successfully!");
    } else {
      console.log("Column exempted_docs already exists.");
    }

    console.log('✅ Migration 20260819_01_add_exempted_docs_column completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
