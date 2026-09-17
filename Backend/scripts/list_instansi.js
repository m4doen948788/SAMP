const mysql = require('mysql2/promise');
require('dotenv').config();

const listInstansi = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [instansi] = await pool.query('SELECT id, instansi, singkatan FROM master_instansi_daerah LIMIT 50');
        console.log('Instansi List:', instansi);
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
listInstansi();
