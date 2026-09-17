const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [res] = await pool.query("UPDATE kegiatan_harian_pegawai SET tipe_kegiatan = 'RLB of' WHERE profil_pegawai_id = 1 AND id_kegiatan_eksternal = '2'");
        console.log('Update Result:', res.affectedRows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
