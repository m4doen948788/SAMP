const pool = require('./src/config/db');

async function checkProgramSchema() {
    const [cols] = await pool.query("DESCRIBE master_program");
    console.log('Columns:', JSON.stringify(cols, null, 2));
    const [rows] = await pool.query("SELECT * FROM master_program LIMIT 20");
    console.log('Sample Rows:', JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkProgramSchema();
