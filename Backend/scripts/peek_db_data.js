const pool = require('./src/config/db');

async function peekData() {
    const queries = [
        'SELECT * FROM master_urusan LIMIT 2',
        'SELECT * FROM master_bidang_urusan LIMIT 2',
        'SELECT * FROM master_program LIMIT 2',
        'SELECT * FROM master_kegiatan LIMIT 2',
        'SELECT * FROM master_sub_kegiatan LIMIT 2'
    ];
    for (let i = 0; i < queries.length; i++) {
        console.log('\\n> ' + queries[i]);
        try {
            const [rows] = await pool.query(queries[i]);
            console.log(rows);
        } catch (e) {
            console.error(e);
        }
    }
    process.exit(0);
}
peekData();
