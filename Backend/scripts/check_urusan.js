const pool = require('./src/config/db');

async function checkUrusan() {
    const [rows] = await pool.query('SELECT * FROM master_urusan');
    console.table(rows);
    process.exit(0);
}
checkUrusan();
