const pool = require('../Backend/src/config/db');

async function checkTable() {
    try {
        const [rows] = await pool.query('DESCRIBE surat_global_settings');
        console.log('--- Table: surat_global_settings ---');
        console.table(rows);
        
        const [rows2] = await pool.query('DESCRIBE surat_templates');
        console.log('--- Table: surat_templates ---');
        console.table(rows2);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTable();
