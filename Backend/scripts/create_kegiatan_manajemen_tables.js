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
    console.log('Starting migration for kegiatan_manajemen...');
    
    // 1. Create kegiatan_manajemen table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kegiatan_manajemen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        nama_kegiatan TEXT NOT NULL,
        surat_undangan_masuk VARCHAR(255) DEFAULT NULL,
        surat_undangan_keluar VARCHAR(255) DEFAULT NULL,
        tematik_ids TEXT DEFAULT NULL,
        bahan_desk VARCHAR(255) DEFAULT NULL,
        paparan VARCHAR(255) DEFAULT NULL,
        jenis_kegiatan_id INT DEFAULT NULL,
        bidang_id INT DEFAULT NULL,
        instansi_penyelenggara VARCHAR(255) DEFAULT NULL,
        petugas_ids TEXT DEFAULT NULL,
        kelengkapan TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table kegiatan_manajemen created or already exists.');

    // 2. Create kegiatan_manajemen_dokumen table for multiple files (Notulensi, Foto, Laporan)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kegiatan_manajemen_dokumen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kegiatan_id INT NOT NULL,
        nama_file VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        tipe_dokumen ENUM('notulensi', 'foto', 'laporan') NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_kegiatan_dokumen FOREIGN KEY (kegiatan_id) 
          REFERENCES kegiatan_manajemen(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table kegiatan_manajemen_dokumen created or already exists.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
