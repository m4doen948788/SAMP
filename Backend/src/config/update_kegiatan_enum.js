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
        console.log('Updating tipe_kegiatan ENUM...');
        // We keep the old ones for now to avoid errors if there's existing data, 
        // though we should ideally migrate data if needed.
        await pool.query(`
            ALTER TABLE kegiatan_harian_pegawai 
            MODIFY COLUMN tipe_kegiatan ENUM('C', 'DL', 'S', 'DLB', 'RM', 'RLB', 'RM-ON', 'RM-OFF', 'RM ol', 'RM of') NOT NULL
        `);
        console.log('Database updated successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
