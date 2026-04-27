const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query("SELECT * FROM master_bidang_instansi WHERE nama_bidang LIKE '%Pemerintahan%'");
    console.log(rows);
    process.exit(0);
}
run();
