const mysql = require('mysql2/promise');
require('dotenv').config();

const checkSchema = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- SCHEMA: mapping_bidang_pengampu ---');
        const [desc] = await pool.query('DESCRIBE mapping_bidang_pengampu');
        console.table(desc);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkSchema();
