const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query('DESCRIBE profil_pegawai');
    console.log(rows);
    process.exit(0);
}
run();
