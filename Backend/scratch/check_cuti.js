const pool = require('./src/config/db');

async function check() {
    try {
        const [rows] = await pool.query("SELECT * FROM surat_templates WHERE nama_jenis_surat LIKE '%cuti%'");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
