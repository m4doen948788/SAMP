const mysql = require('mysql2/promise');
require('dotenv').config({ path: './Backend/.env' });

async function testQuery() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await pool.query(`
            SELECT s.*,
            (
                SELECT GROUP_CONCAT(DISTINCT mt.nama_tematik SEPARATOR ', ')
                FROM dokumen_tematik dt
                JOIN master_tematik mt ON dt.tematik_id = mt.id
                WHERE dt.dokumen_id = s.dokumen_id
            ) as tematik_terkait
            FROM surat s
            LIMIT 1
        `);
        console.log('Success:', rows);
    } catch (err) {
        console.error('Error Details:', err);
    } finally {
        await pool.end();
    }
}

testQuery();
