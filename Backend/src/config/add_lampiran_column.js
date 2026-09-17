const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/.env' });

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding lampiran_kegiatan column...');
        await pool.query(`
            ALTER TABLE kegiatan_harian_pegawai 
            ADD COLUMN IF NOT EXISTS lampiran_kegiatan VARCHAR(255) DEFAULT ''
        `);
        console.log('Database migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
