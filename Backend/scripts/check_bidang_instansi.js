const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('SELECT * FROM master_bidang_instansi LIMIT 5');
        console.log('Bidang Instansi Data: ' + JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
