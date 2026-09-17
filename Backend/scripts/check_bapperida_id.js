const pool = require('./src/config/db');

async function check() {
    try {
        const [rows] = await pool.query(`SELECT id, instansi, singkatan FROM master_instansi_daerah WHERE singkatan = 'Bapperida'`);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
