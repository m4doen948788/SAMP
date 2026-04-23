const pool = require('./src/config/db');

async function run() {
    try {
        const [kab] = await pool.query("SELECT id, nama FROM master_kota_kabupaten WHERE nama LIKE '%Bogor%' AND nama LIKE '%Kab%'");
        console.log("KAB:", JSON.stringify(kab));
        if (kab.length > 0) {
            const [[{count}]] = await pool.query("SELECT COUNT(*) as count FROM master_kecamatan WHERE kota_kabupaten_id = ?", [kab[0].id]);
            console.log("COUNT:", count);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
