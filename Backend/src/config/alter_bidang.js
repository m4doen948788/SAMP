const pool = require('./db');

async function alterBidang() {
    try {
        try {
            await pool.query('ALTER TABLE master_bidang ADD COLUMN singkatan VARCHAR(100) AFTER nama_bidang');
            console.log('Added singkatan column');
        } catch (e) {
            console.log('singkatan column:', e.message);
        }
        try {
            await pool.query('ALTER TABLE master_bidang ADD COLUMN instansi_id INT NULL AFTER singkatan');
            console.log('Added instansi_id column');
        } catch (e) {
            console.log('instansi_id column:', e.message);
        }
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err.message);
        process.exit(1);
    }
}

alterBidang();
