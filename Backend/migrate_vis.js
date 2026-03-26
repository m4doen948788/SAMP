const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log('Connecting to:', process.env.DB_HOST);
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Adding column is_superadmin_only to buku_referensi...');
        await connection.execute('ALTER TABLE buku_referensi ADD COLUMN is_superadmin_only BOOLEAN DEFAULT FALSE');
        console.log('Migration successful!');
        await connection.end();
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column already exists.');
        } else {
            console.error('Migration failed:', err.message);
            process.exit(1);
        }
    }
}

migrate();
