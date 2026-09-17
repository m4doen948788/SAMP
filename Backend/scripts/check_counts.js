const pool = require('./src/config/db');

async function checkCounts() {
  try {
    const [rows] = await pool.query('SELECT * FROM master_kelurahan');
    console.log(`Total rows in master_kelurahan: ${rows.length}`);
    
    const kelurahan = rows.filter(r => r.nama.toLowerCase().startsWith('kelurahan') || r.nama.toLowerCase().includes('kelurahan'));
    const desa = rows.filter(r => r.nama.toLowerCase().startsWith('desa') || r.nama.toLowerCase().includes('desa'));
    
    console.log(`Kelurahan-like names: ${kelurahan.length}`);
    console.log(`Desa-like names: ${desa.length}`);
    
    // Check if there's a type column
    const [columns] = await pool.query('SHOW COLUMNS FROM master_kelurahan');
    console.log('Columns in master_kelurahan:', columns.map(c => c.Field).join(', '));

    // Group by kecamatan to see if any kecamatan is missing villages
    const [kecamatan] = await pool.query('SELECT k.id, k.nama, COUNT(kl.id) as total FROM master_kecamatan k LEFT JOIN master_kelurahan kl ON k.id = kl.kecamatan_id GROUP BY k.id, k.nama');
    console.log('Village count per kecamatan:');
    kecamatan.forEach(k => {
        console.log(`${k.nama}: ${k.total}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkCounts();
