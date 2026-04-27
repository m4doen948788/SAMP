const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query("SELECT * FROM profil_pegawai WHERE nama_lengkap LIKE '%Nugi%'");
    console.log(rows);
    process.exit(0);
}
run();
