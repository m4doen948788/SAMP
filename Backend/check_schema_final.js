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
        const [cols] = await pool.query('DESCRIBE master_urusan');
        console.log('master_urusan cols:', cols);

        const [triggers] = await pool.query('SHOW TRIGGERS LIKE "mapping_urusan_instansi"');
        console.log('mapping_urusan_instansi triggers:', triggers);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkSchema();
