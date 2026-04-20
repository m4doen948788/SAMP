const mysql = require('mysql2/promise');
require('dotenv').config({ path: './Backend/.env' });

async function describeTables() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const tables = ['surat', 'dokumen_upload', 'master_bidang_instansi', 'master_dokumen'];
        for (const table of tables) {
            console.log(`--- Table: ${table} ---`);
            try {
                const [cols] = await pool.query(`DESCRIBE ${table}`);
                console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
            } catch (e) {
                console.error(`Error describing ${table}:`, e.message);
            }
        }
    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await pool.end();
    }
}

describeTables();
