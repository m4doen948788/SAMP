const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query("SELECT nama_lengkap, bidang_id FROM profil_pegawai WHERE nama_lengkap LIKE '%Agung Gusnardi%' OR nama_lengkap LIKE '%Nugraha Istiantoro%'");
    console.log(rows);
    process.exit(0);
}
run();
