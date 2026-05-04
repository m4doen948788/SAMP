const pool = require('../Backend/src/config/db');

async function checkTable() {
    try {
        const [rows] = await pool.query('DESCRIBE surat_global_settings');
        console.log('--- Table: surat_global_settings ---');
        console.log(JSON.stringify(rows, null, 2));
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTable();
