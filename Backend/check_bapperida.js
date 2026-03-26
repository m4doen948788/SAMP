const pool = require('./src/config/db');

async function check() {
    try {
        console.log("--- Mencari Pejabat Bapperida ---");
        const [rows] = await pool.query(`
            SELECT p.nama_lengkap, j.jabatan, i.instansi 
            FROM profil_pegawai p 
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id 
            LEFT JOIN master_instansi_daerah i ON p.instansi_id = i.id 
            WHERE i.instansi LIKE '%Bapperida%' OR p.nama_lengkap LIKE '%Bambam%' OR p.nama_lengkap LIKE '%Ajat%'
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
