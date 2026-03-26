const pool = require('./src/config/db');
async function run() {
    try {
        const [rows] = await pool.query(`
            SELECT id, tanggal, keterangan, nama_kegiatan, tipe_kegiatan 
            FROM kegiatan_harian_pegawai 
            WHERE profil_pegawai_id = 4 
            AND MONTH(tanggal) = 3 
            AND YEAR(tanggal) = 2026
        `);
        console.log('AUDIT_RESULT_START');
        console.log(JSON.stringify(rows, null, 2));
        console.log('AUDIT_RESULT_END');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
