const pool = require('../Backend/src/config/db');

async function checkTableStructure() {
    try {
        const [rows] = await pool.query('DESCRIBE skp_pegawai_docs');
        console.log('--- Table Structure: skp_pegawai_docs ---');
        console.table(rows);

        const [rows2] = await pool.query('DESCRIBE skp_monthly_links');
        console.log('--- Table Structure: skp_monthly_links ---');
        console.table(rows2);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTableStructure();
