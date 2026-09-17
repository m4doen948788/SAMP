const pool = require('./src/config/db');

async function check() {
    try {
        const [cols] = await pool.query('DESCRIBE master_tahun');
        console.log(JSON.stringify(cols, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
