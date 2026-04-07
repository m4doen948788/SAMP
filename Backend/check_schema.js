const pool = require('./src/config/db');
async function run() {
    try {
        const [rows] = await pool.query('DESCRIBE kegiatan_harian_pegawai');
        console.log(JSON.stringify(rows));
        const [indexes] = await pool.query('SHOW INDEX FROM kegiatan_harian_pegawai');
        console.log("INDEXES:" + JSON.stringify(indexes));
        process.exit(0);
    } catch (err) {
        console.error("FAIL:" + err.message);
        process.exit(1);
    }
}
run();
