const pool = require('./src/config/db');

async function listAllPrograms() {
    const [rows] = await pool.query("SELECT * FROM master_program");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

listAllPrograms();
