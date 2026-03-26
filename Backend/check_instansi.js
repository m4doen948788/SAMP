const pool = require('./src/config/db');

async function check() {
    try {
        console.log("--- Daftar Instansi & Singkatan ---");
        const [rows] = await pool.query(`SELECT instansi, singkatan FROM master_instansi_daerah`);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
