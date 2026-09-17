const mysql = require('mysql2/promise');
require('dotenv').config();

const checkUrusan = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await pool.query('SELECT id, urusan FROM master_urusan LIMIT 5');
        console.log('Sample urusan:', rows);

        const [nullRows] = await pool.query('SELECT COUNT(*) as cnt FROM master_urusan WHERE urusan IS NULL OR urusan = ""');
        console.log('Empty urusan count:', nullRows[0].cnt);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkUrusan();
