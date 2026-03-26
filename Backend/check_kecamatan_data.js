const pool = require('./src/config/db');

async function run() {
    try {
        const [rows] = await pool.query("SELECT instansi FROM master_instansi_daerah WHERE instansi LIKE 'Kecamatan%'");
        console.log('Kecamatan Data:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
