const pool = require('./src/config/db');

async function checkPenunjang() {
    const [rows] = await pool.query("SELECT * FROM master_program WHERE nama_program LIKE '%PENUNJANG%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkPenunjang();
