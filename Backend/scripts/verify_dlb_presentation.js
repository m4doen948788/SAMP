const pool = require('./src/config/db');
async function run() {
    try {
        const [rows] = await pool.query(`
            SELECT tanggal, sesi, kode_tipe, nama_kegiatan 
            FROM v_rekap_kegiatan_harian 
            WHERE profil_pegawai_id = 4 
              AND kode_tipe = 'DLB' 
              AND MONTH(tanggal) = 3 
              AND YEAR(tanggal) = 2026
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
