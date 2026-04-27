const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query("SELECT id, nama_lengkap, bidang_id FROM profil_pegawai WHERE nama_lengkap LIKE '%Iqmal%'");
    console.log(rows);
    process.exit(0);
}
run();
