const pool = require('./src/config/db');

async function run() {
    try {
        const [rows] = await pool.query("SELECT nama FROM master_kecamatan WHERE kota_kabupaten_id = '3201' ORDER BY nama ASC");
        console.log("DATA:", JSON.stringify(rows.map(r => r.nama)));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
