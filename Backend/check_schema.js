const pool = require('./src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM dokumen_upload');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
