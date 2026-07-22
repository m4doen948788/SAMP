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
      SELECT s.bulan, s.butir_skp, COUNT(*) as count, SUM(CASE WHEN s.doc_name IS NOT NULL THEN 1 ELSE 0 END) as has_doc_count
      FROM skp_pegawai_docs s
      JOIN profil_pegawai pp ON s.pegawai_id = pp.id
      WHERE s.tahun = 2026 AND pp.bidang_id = 2 AND s.kategori = 'pendukung'
      GROUP BY s.bulan, s.butir_skp
    `);
    
    console.log('--- SUMMARY OF PENDUKUNG DOCUMENTS IN DB (YEAR 2026) ---');
    rows.forEach(r => {
      console.log(`Month: ${r.bulan} | Butir: "${r.butir_skp.replace(/\n/g, ' ')}" | Total: ${r.count} | Has Doc: ${r.has_doc_count}`);
    });

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
