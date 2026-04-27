const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query(`
        SELECT p.nama_lengkap, b.nama_bidang, COUNT(k.id) as total 
        FROM profil_pegawai p 
        LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id 
        LEFT JOIN kegiatan_harian_pegawai k ON p.id = k.profil_pegawai_id 
        WHERE MONTH(k.tanggal) = 4 AND YEAR(k.tanggal) = 2026 
        GROUP BY p.id 
        ORDER BY total DESC 
        LIMIT 5
    `);
    console.log(rows);
    process.exit(0);
}
run();
