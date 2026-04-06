const pool = require('./Backend/src/config/db');
async function check() {
    try {
        console.log('--- Checking Activity ID 2 ---');
        const [rows] = await pool.query('SELECT id, CAST(tanggal AS CHAR) as t_str, tanggal, nama_kegiatan, petugas_ids FROM kegiatan_manajemen WHERE id = 2');
        if (rows.length === 0) {
            console.log('Record id 2 not found. Checking all records on 2026-04-07...');
            const [all] = await pool.query('SELECT id, CAST(tanggal AS CHAR) as t_str, nama_kegiatan FROM kegiatan_manajemen WHERE tanggal = "2026-04-07"');
            console.log('All activities on 2026-04-07:', JSON.stringify(all));
        } else {
            console.log('Manajemen Record:', JSON.stringify(rows[0]));
        }
        
        const [harian] = await pool.query('SELECT id, CAST(tanggal AS CHAR) as t_harian_str, tanggal, profil_pegawai_id FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [2]);
        console.log('Harian Records for activity 2:', JSON.stringify(harian));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
