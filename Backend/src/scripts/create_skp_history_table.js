const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/SAMP/Backend/.env' });

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'samp_db'
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS skp_edit_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pegawai_id INT NULL,
          user_id INT NULL,
          tahun INT NOT NULL,
          bidang_id INT NOT NULL,
          kategori VARCHAR(50) NOT NULL,
          bulan INT NULL,
          butir_skp TEXT NULL,
          aksi VARCHAR(50) NOT NULL,
          keterangan TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Created skp_edit_history table successfully');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
