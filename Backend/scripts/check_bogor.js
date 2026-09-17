const pool = require('./src/config/db');

async function checkBogor() {
  try {
    const [rows] = await pool.query(`
        SELECT kc.nama as kecamatan_nama, kl.nama as kelurahan_nama, kl.id
        FROM master_kelurahan kl
        JOIN master_kecamatan kc ON kl.kecamatan_id = kc.id
        WHERE kc.kota_kabupaten_id = '3201'
        ORDER BY kc.nama, kl.nama
    `);
    
    console.log(`Total in Bogor: ${rows.length}`);
    
    // Count per kecamatan
    const counts = {};
    rows.forEach(r => {
      counts[r.kecamatan_nama] = (counts[r.kecamatan_nama] || 0) + 1;
    });
    
    console.log('Counts per Kecamatan in Bogor:');
    Object.keys(counts).sort().forEach(k => {
      console.log(`${k}: ${counts[k]}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkBogor();
