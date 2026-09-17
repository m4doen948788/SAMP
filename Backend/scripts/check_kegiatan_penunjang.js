const pool = require('./src/config/db');

async function checkKegiatanPenunjang() {
    const [rows] = await pool.query("SELECT * FROM master_kegiatan WHERE nama_kegiatan LIKE '%ADMINISTRASI%' LIMIT 10");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkKegiatanPenunjang();
