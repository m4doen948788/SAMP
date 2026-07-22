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

    console.log('--- DATABASE CONFIG ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);

    // 1. Get Riani's profile
    const [riani] = await pool.query('SELECT * FROM profil_pegawai WHERE nama_lengkap LIKE "%Riani%"');
    console.log('\n--- RIANI PROFILE ---');
    console.log(riani);

    if (riani.length > 0) {
      const rId = riani[0].id;
      // 2. Get Riani's team mappings
      const [teams] = await pool.query('SELECT * FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?', [rId]);
      console.log('\n--- RIANI TEAM MAPPINGS ---');
      console.log(teams);

      // 3. Get Riani's documents
      const [docs] = await pool.query('SELECT * FROM skp_pegawai_docs WHERE pegawai_id = ? AND tahun = 2026', [rId]);
      console.log('\n--- RIANI DOCUMENTS (2026) ---');
      console.log(docs);
    }

    // 4. Get all documents for year 2026, month 7 in Bidang 2
    const [allDocs] = await pool.query(
      'SELECT s.*, pp.nama_lengkap FROM skp_pegawai_docs s ' +
      'JOIN profil_pegawai pp ON s.pegawai_id = pp.id ' +
      'WHERE s.tahun = 2026 AND s.bulan = 7 AND pp.bidang_id = 2'
    );
    console.log('\n--- ALL DOCUMENTS FOR BIDANG 2, MONTH 7, YEAR 2026 ---');
    allDocs.forEach(d => {
      console.log(`- ${d.nama_lengkap} (ID: ${d.pegawai_id}): ${d.doc_name} | butir: ${d.butir_skp}`);
    });

  } catch (err) {
    console.error('Error running check script:', err);
  }
  process.exit(0);
})();
