const pool = require('../Backend/src/config/db');

async function checkData() {
    try {
        const [rows] = await pool.query('SELECT * FROM surat_global_settings');
        console.log('--- Data: surat_global_settings ---');
        console.log(JSON.stringify(rows, null, 2));
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
