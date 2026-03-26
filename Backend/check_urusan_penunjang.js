const pool = require('./src/config/db');

async function checkUrusanPenunjang() {
    const [rows] = await pool.query("SELECT * FROM master_urusan WHERE nama_urusan LIKE '%PENUNJANG%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkUrusanPenunjang();
