const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('SELECT bidang_id, COUNT(*) as count FROM profil_pegawai WHERE instansi_id = 2 GROUP BY bidang_id');
        console.log('User Distribution in Instansi 2:', JSON.stringify(rows));
        
        const [sammy] = await pool.query('SELECT * FROM profil_pegawai WHERE id = 1');
        console.log('Sammy Complete Data:', JSON.stringify(sammy[0]));
        
        const [bidangs] = await pool.query('SELECT * FROM master_bidang');
        console.log('All Master Bidangs:', JSON.stringify(bidangs));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
