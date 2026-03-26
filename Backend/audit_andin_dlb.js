const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Kegiatan DLB Andin (Corrected) ---");
        // Andin ID = 4
        const [rows] = await pool.query(`
            SELECT * FROM kegiatan_harian_pegawai 
            WHERE profil_pegawai_id = 4 AND tipe_kegiatan = 'DLB' AND MONTH(tanggal) = 3 AND YEAR(tanggal) = 2026
        `);
        console.log("KEGIATAN DLB MARET:", JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
