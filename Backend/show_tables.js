const pool = require('./src/config/db');

async function showTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        rows.forEach(row => console.log(Object.values(row)[0]));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
showTables();
