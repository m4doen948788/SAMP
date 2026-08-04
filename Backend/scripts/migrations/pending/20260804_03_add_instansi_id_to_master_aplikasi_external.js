const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log("Checking master_aplikasi_external columns for instansi_id...");
    const [cols] = await pool.query('SHOW COLUMNS FROM master_aplikasi_external');
    const hasInstansiId = cols.some(c => c.Field === 'instansi_id');

    if (!hasInstansiId) {
      console.log("Adding instansi_id column...");
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN instansi_id INT AFTER tipe_link_id');
      console.log("Column instansi_id added successfully!");
    } else {
      console.log("Column instansi_id already exists.");
    }

    // Populate instansi_id for existing rows based on created_by user's profil_pegawai instansi_id or default instansi (2)
    console.log("Populating instansi_id for existing rows...");
    const [updateRes] = await pool.query(`
      UPDATE master_aplikasi_external a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id
      SET a.instansi_id = COALESCE(p.instansi_id, 2)
      WHERE a.instansi_id IS NULL OR a.instansi_id = 0
    `);
    console.log(`Updated ${updateRes.affectedRows} rows with instansi_id.`);

    console.log('✅ Migration 20260804_03_add_instansi_id_to_master_aplikasi_external completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
