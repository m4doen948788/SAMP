const mysql = require('mysql2/promise');
require('dotenv').config();

const checkTables = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- TABLES & VIEWS ---');
        const [rows] = await pool.query("SHOW FULL TABLES");
        console.table(rows);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkTables();
