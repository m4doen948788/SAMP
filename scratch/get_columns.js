const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query('SHOW COLUMNS FROM profil_pegawai');
    console.log(rows.map(r => r.Field));
    process.exit(0);
}
run();
