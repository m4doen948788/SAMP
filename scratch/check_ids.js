const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query("SELECT id, nama_lengkap FROM profil_pegawai WHERE nama_lengkap LIKE '%Agung Gusnardi%' OR nama_lengkap LIKE '%Nugraha Istiantoro%' OR nama_lengkap LIKE '%Titi Sugiarti%'");
    console.log(rows);
    process.exit(0);
}
run();
