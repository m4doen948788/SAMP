const pool = require('../Backend/src/config/db');
async function run() {
    const [rows] = await pool.query(`
        SELECT p.nama_lengkap, COUNT(k.id) as total 
        FROM profil_pegawai p 
        LEFT JOIN kegiatan_harian_pegawai k ON p.id = k.profil_pegawai_id 
        WHERE p.nama_lengkap LIKE '%Agung Gusnardi%' OR p.nama_lengkap LIKE '%Nugraha Istiantoro%'
        GROUP BY p.id
    `);
    console.log(rows);
    process.exit(0);
}
run();
