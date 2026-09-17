const pool = require('./src/config/db');

async function check() {
    try {
        console.log('=== nayaxa_api_keys ===');
        const [keys] = await pool.query('SELECT * FROM nayaxa_api_keys');
        console.table(keys);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
