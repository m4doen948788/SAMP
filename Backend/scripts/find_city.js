const pool = require('./src/config/db');

async function findTargetCity() {
  try {
    const [cityCounts] = await pool.query(`
        SELECT k.id, k.nama as kota_nama, COUNT(kl.id) as total_desa_kel
        FROM master_kota_kabupaten k
        JOIN master_kecamatan kc ON k.id = kc.kota_kabupaten_id
        JOIN master_kelurahan kl ON kc.id = kl.kecamatan_id
        GROUP BY k.id, k.nama
        HAVING total_desa_kel = 425 OR total_desa_kel BETWEEN 400 AND 450
        ORDER BY total_desa_kel DESC
    `);
    
    console.log('Cities with village count near 435:');
    cityCounts.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name || c.kota_nama}, Current Count: ${c.total_desa_kel}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

findTargetCity();
