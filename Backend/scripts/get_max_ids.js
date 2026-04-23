const pool = require('./src/config/db');

const kecIds = [
  '3201140', // BABAKAN MADANG
  '3201250', // GUNUNG SINDUR
  '3201050', // CIAMPEA
  '3201040', // CIBUNGBULANG
  '3201030', // PAMIJAHAN
  '3201271', // SUKAJAYA
  '3201280', // JASINGA
  '3201181'  // KELAPA NUNGGAL
];

async function getMaxIds() {
  try {
    const results = {};
    for (const id of kecIds) {
      const [rows] = await pool.query('SELECT MAX(id) as max_id FROM master_kelurahan WHERE kecamatan_id = ?', [id]);
      results[id] = rows[0].max_id;
    }
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

getMaxIds();
