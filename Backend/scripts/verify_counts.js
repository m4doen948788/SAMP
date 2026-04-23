const pool = require('./src/config/db');

async function verifyBogor() {
  try {
    const [rows] = await pool.query(`
        SELECT COUNT(kl.id) as total
        FROM master_kelurahan kl
        JOIN master_kecamatan kc ON kl.kecamatan_id = kc.id
        WHERE kc.kota_kabupaten_id = '3201'
    `);
    
    console.log(`Total in Bogor: ${rows[0].total}`);
    
    // Check specific kecamatan which were missing villages
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
    
    for (const name of targetKecamatan) {
        const [kRows] = await pool.query(`
            SELECT COUNT(kl.id) as count
            FROM master_kelurahan kl
            JOIN master_kecamatan kc ON kl.kecamatan_id = kc.id
            WHERE kc.nama = ? AND kc.kota_kabupaten_id = '3201'
        `, [name]);
        console.log(`${name}: ${kRows[0].count}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

verifyBogor();
