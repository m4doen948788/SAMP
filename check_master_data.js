const pool = require('./Backend/src/config/db');
async function run() {
    try {
        const [rows] = await pool.query('SELECT id, kode, nama, parent_id FROM master_tipe_kegiatan');
        console.log('Master data:', JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
