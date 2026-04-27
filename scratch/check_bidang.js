const pool = require('../Backend/src/config/db');
async function run() {
    try {
        const [rows] = await pool.query("SELECT bidang_id, instansi_id, nama_lengkap FROM profil_pegawai WHERE nama_lengkap LIKE '%Iqmal%'");
        console.log('Pegawai:', rows);
        if (rows.length > 0) {
            const [bidang] = await pool.query("SELECT * FROM master_bidang_instansi WHERE id = ?", [rows[0].bidang_id]);
            console.log('Bidang:', bidang);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
