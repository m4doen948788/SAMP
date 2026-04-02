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

async function listCurrentVillages() {
  try {
    for (const name of targetKecamatan) {
        const [rows] = await pool.query(`
            SELECT kl.nama as kelurahan_nama
            FROM master_kelurahan kl
            JOIN master_kecamatan kc ON kl.kecamatan_id = kc.id
            WHERE kc.nama = ? AND kc.kota_kabupaten_id = '3201'
            ORDER BY kl.nama
        `, [name]);
        
        console.log(`\n--- ${name} (${rows.length}) ---`);
        rows.forEach(r => console.log(r.kelurahan_nama));
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

listCurrentVillages();
