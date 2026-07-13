const pool = require('../src/config/db');

async function run() {
  try {
    // 1. Cek apakah kolom is_surat sudah ada di master_dokumen
    const [cols] = await pool.query("SHOW COLUMNS FROM master_dokumen LIKE 'is_surat'");
    if (cols.length === 0) {
      console.log('Adding column is_surat to master_dokumen...');
      await pool.query("ALTER TABLE master_dokumen ADD COLUMN is_surat TINYINT(1) NOT NULL DEFAULT 0");
      console.log('Column is_surat added successfully.');
    } else {
      console.log('Column is_surat already exists.');
    }

    // 2. Tandai jenis dokumen yang merupakan surat (LOWER(dokumen) LIKE '%surat%')
    console.log('Updating is_surat flags for documents containing "surat"...');
    const [result] = await pool.query("UPDATE master_dokumen SET is_surat = 1 WHERE LOWER(dokumen) LIKE '%surat%'");
    console.log(`Updated ${result.affectedRows} rows.`);

    // 3. Tampilkan datanya untuk konfirmasi
    const [rows] = await pool.query("SELECT id, dokumen, is_surat FROM master_dokumen");
    console.table(rows);

    console.log('Migration done!');
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

run();
