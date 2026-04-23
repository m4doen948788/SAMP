const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding bidang_bapperida_id column to master_urusan...');
        await connection.query('ALTER TABLE master_urusan ADD COLUMN IF NOT EXISTS bidang_bapperida_id INT');
        console.log('Success!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
};

migrate();
