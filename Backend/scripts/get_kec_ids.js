const pool = require('./src/config/db');

const targetKecamatan = [
  'BABAKAN MADANG',
  'GUNUNG SINDUR',
  'CIAMPEA',
  'CIBUNGBULANG',
  'PAMIJAHAN',
  'SUKAJAYA',
  'JASINGA',
  'KELAPA NUNGGAL'
];

async function getKecamatanIds() {
  try {
    const [rows] = await pool.query(`
        SELECT id, nama
        FROM master_kecamatan
        WHERE nama IN (?) AND kota_kabupaten_id = '3201'
    `, [targetKecamatan]);
    
    console.log(JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

getKecamatanIds();
