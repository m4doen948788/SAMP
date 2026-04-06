const pool = require('./Backend/src/config/db');
async function check() {
    try {
        console.log('--- Checking Activity ID 2 ---');
        const [rows] = await pool.query('SELECT id, CAST(tanggal AS CHAR) as t_str, tanggal, nama_kegiatan, petugas_ids FROM kegiatan_manajemen WHERE id = 2');
        console.log('Manajemen Record:', JSON.stringify(rows[0]));
        
        const [harian] = await pool.query('SELECT id, CAST(tanggal AS CHAR) as t_harian_str, tanggal, profil_pegawai_id FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [2]);
        console.log('Harian Records for this activity:', JSON.stringify(harian));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
