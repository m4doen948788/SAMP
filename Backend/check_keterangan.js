const pool = require('./src/config/db');

async function check() {
    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM kegiatan_manajemen LIKE "keterangan"');
        console.log('Result:', JSON.stringify(cols));
        process.exit(0);
    } catch (err) {
        console.error('Error detail:', err.message);
        process.exit(1);
    }
}

check();
