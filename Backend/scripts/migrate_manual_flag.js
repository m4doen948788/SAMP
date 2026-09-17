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
        console.log('Adding is_manual column to mapping_urusan_instansi...');
        await connection.query('ALTER TABLE mapping_urusan_instansi ADD COLUMN IF NOT EXISTS is_manual TINYINT DEFAULT 1');
        console.log('Success!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
};

migrate();
