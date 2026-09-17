const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const kegiatanId = 2;
        const [kegData] = await pool.query(`
            SELECT k.*, DATE_FORMAT(k.tanggal, '%Y-%m-%d') as tanggal_str, t.kode as tipe_kode 
            FROM kegiatan_manajemen k
            LEFT JOIN master_tipe_kegiatan t ON k.jenis_kegiatan_id = t.id
            WHERE k.id = ?
        `, [kegiatanId]);
        
        console.log('Keg Data:', JSON.stringify(kegData[0]));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
