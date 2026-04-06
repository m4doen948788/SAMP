const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.log('Tables: ' + JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
