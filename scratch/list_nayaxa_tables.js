const pool = require('../Backend/src/config/db');
async function run() {
    try {
        const [rows] = await pool.query('SHOW TABLES LIKE "nayaxa%"');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e.message);
    }
    process.exit();
}
run();
