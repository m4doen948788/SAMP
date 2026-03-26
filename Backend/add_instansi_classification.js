const pool = require('./src/config/db');

async function run() {
    try {
        console.log('=== Migration: Add instansi classification columns ===');

        // Add kelas_instansi column to master_instansi_daerah table
        try {
            await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN kelas_instansi VARCHAR(255) DEFAULT NULL AFTER singkatan');
            console.log('Added kelas_instansi column to master_instansi_daerah.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('kelas_instansi column already exists.');
            } else {
                throw e;
            }
        }

        // Add kelompok_instansi column to master_instansi_daerah table
        try {
            await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN kelompok_instansi VARCHAR(255) DEFAULT NULL AFTER kelas_instansi');
            console.log('Added kelompok_instansi column to master_instansi_daerah.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('kelompok_instansi column already exists.');
            } else {
                throw e;
            }
        }

        console.log('=== Migration complete ===');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
