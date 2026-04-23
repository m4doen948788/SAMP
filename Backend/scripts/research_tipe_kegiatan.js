const pool = require('./src/config/db');

async function research() {
    try {
        const [rows] = await pool.query("SELECT id, nama, parent_id, kode FROM master_tipe_kegiatan");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
research();
