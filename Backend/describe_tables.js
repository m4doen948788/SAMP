const pool = require('./src/config/db');

async function check() {
    try {
                const [rows] = await pool.query('SHOW CREATE TABLE master_instansi_daerah');
        console.log(rows[0]['Create Table']);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
