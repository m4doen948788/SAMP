const pool = require('./src/config/db');

async function checkCounts() {
  try {
    const [rows] = await pool.query('SELECT nama FROM master_kelurahan');
    console.log(`Total rows in master_kelurahan: ${rows.length}`);
    
    let kelurahanCount = 0;
    let desaCount = 0;
    let others = 0;

    rows.forEach(r => {
      const name = r.nama.toLowerCase();
      if (name.startsWith('kelurahan ')) {
        kelurahanCount++;
      } else if (name.startsWith('desa ')) {
        desaCount++;
      } else {
        others++;
      }
    });
    
    console.log(`Kelurahan (starts with 'Kelurahan '): ${kelurahanCount}`);
    console.log(`Desa (starts with 'Desa '): ${desaCount}`);
    console.log(`Others: ${others}`);

    // Let's see which city/regency has the most villages
    const [cityCounts] = await pool.query(`
        SELECT k.nama as kota_nama, COUNT(kl.id) as total_desa_kel
        FROM master_kota_kabupaten k
        JOIN master_kecamatan kc ON k.id = kc.kota_kabupaten_id
        JOIN master_kelurahan kl ON kc.id = kl.kecamatan_id
        GROUP BY k.id, k.nama
        ORDER BY total_desa_kel DESC
    `);
    
    console.log('Top cities by village count:');
    cityCounts.slice(0, 10).forEach(c => {
        console.log(`${c.kota_nama}: ${c.total_desa_kel}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkCounts();
