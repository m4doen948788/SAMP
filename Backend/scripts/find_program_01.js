const pool = require('./src/config/db');

async function checkProgram01() {
    const [rows] = await pool.query("SELECT * FROM master_program WHERE kode_program = '01' OR nama_program LIKE '%PENUNJANG%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}

checkProgram01();
