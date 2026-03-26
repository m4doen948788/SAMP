const pool = require('./src/config/db');

async function checkSubPenunjang() {
    const [rows] = await pool.query("SELECT * FROM master_sub_kegiatan WHERE nama_sub_kegiatan LIKE '%PENUNJANG%' LIMIT 10");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkSubPenunjang();
