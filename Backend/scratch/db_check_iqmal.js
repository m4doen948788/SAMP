const pool = require('../src/config/db');

async function check() {
    try {
        const [rows] = await pool.query('SELECT * FROM skp_pegawai_docs WHERE pegawai_id = 49');
        console.log('--- IQMAL SKP RECORDS ---');
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
