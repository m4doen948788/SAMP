const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrate() {
  try {
    console.log('Migrating activity tables for document system integration...');

    // 1. Update kegiatan_manajemen
    await pool.query(`
      ALTER TABLE kegiatan_manajemen
      ADD COLUMN surat_undangan_masuk_id INT NULL,
      ADD COLUMN surat_undangan_keluar_id INT NULL,
      ADD COLUMN bahan_desk_id INT NULL,
      ADD COLUMN paparan_id INT NULL
    `);
    console.log('Updated kegiatan_manajemen table.');

    // 2. Update kegiatan_manajemen_dokumen
    await pool.query(`
      ALTER TABLE kegiatan_manajemen_dokumen
      ADD COLUMN dokumen_id INT NULL
    `);
    console.log('Updated kegiatan_manajemen_dokumen table.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
