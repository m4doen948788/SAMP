const pool = require('./src/config/db');

async function run() {
    try {
        const [cols] = await pool.query('DESCRIBE kegiatan_harian_pegawai');
        console.log(JSON.stringify(cols, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
