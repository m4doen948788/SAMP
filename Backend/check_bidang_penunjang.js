const pool = require('./src/config/db');

async function checkBidangPenunjang() {
    const [rows] = await pool.query("SELECT * FROM master_bidang_urusan WHERE urusan LIKE '%PENUNJANG%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkBidangPenunjang();
