const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [cols] = await pool.query('DESCRIBE surat');
        console.log(JSON.stringify(cols, null, 2));
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
