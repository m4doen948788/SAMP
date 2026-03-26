const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function migrate() {
    console.log('Using DB_HOST:', process.env.DB_HOST);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('Creating master_hari_libur table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS master_hari_libur (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanggal DATE NOT NULL UNIQUE,
                keterangan VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table master_hari_libur created successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
