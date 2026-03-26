const pool = require('./src/config/db');

async function searchExtensive() {
    const queries = [
        "SELECT * FROM master_urusan WHERE kode_urusan LIKE 'X%'",
        "SELECT * FROM master_bidang_urusan WHERE kode_urusan LIKE 'X%'",
        "SELECT * FROM master_program WHERE nama_program LIKE '%Penunjang%'",
        "SELECT * FROM master_program WHERE kode_program LIKE '01%'",
        "SELECT * FROM master_urusan WHERE urusan LIKE '%Penunjang%'"
    ];

    for (const q of queries) {
        console.log('--- Query:', q);
        const [rows] = await pool.query(q);
        console.log(JSON.stringify(rows, null, 2));
    }
    process.exit(0);
}

searchExtensive();
