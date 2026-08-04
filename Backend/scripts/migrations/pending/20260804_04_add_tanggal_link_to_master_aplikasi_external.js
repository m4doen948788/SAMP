const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log("Checking master_aplikasi_external columns for tanggal_link...");
    const [cols] = await pool.query('SHOW COLUMNS FROM master_aplikasi_external');
    const hasTanggalLink = cols.some(c => c.Field === 'tanggal_link');

    if (!hasTanggalLink) {
      console.log("Adding tanggal_link column...");
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tanggal_link DATE NULL AFTER keterangan');
      console.log("Column tanggal_link added successfully!");
    } else {
      console.log("Column tanggal_link already exists.");
    }

    console.log('✅ Migration 20260804_04_add_tanggal_link_to_master_aplikasi_external completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
