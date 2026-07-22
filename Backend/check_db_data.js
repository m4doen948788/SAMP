const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const [rows] = await pool.query(`
      SELECT s.id, s.pegawai_id, pp.nama_lengkap, s.bulan, s.kategori, s.doc_name, s.butir_skp 
      FROM skp_pegawai_docs s
      JOIN profil_pegawai pp ON s.pegawai_id = pp.id
      WHERE s.tahun = 2026 AND pp.bidang_id = 2
    `);
    
    console.log(JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
