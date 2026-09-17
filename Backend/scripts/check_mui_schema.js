const mysql = require('mysql2/promise');
require('dotenv').config();

const checkMuiTable = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- SCHEMA: mapping_urusan_instansi ---');
        const [desc] = await pool.query('DESCRIBE mapping_urusan_instansi');
        console.table(desc);

        console.log('\n--- CREATE TABLE ---');
        const [create] = await pool.query('SHOW CREATE TABLE mapping_urusan_instansi');
        console.log(create[0]['Create Table']);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkMuiTable();
