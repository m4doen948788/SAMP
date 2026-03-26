const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Kegiatan DLB Andin ---");
        // Andin ID = 4
        const [rows] = await pool.query(`
            SELECT k.*, tk.nama as tipe_kegiatan_nama 
            FROM kegiatan_harian_pegawai k
            LEFT JOIN master_tipe_kegiatan tk ON k.tipe_kegiatan_id = tk.id
            WHERE k.profil_pegawai_id = 4 AND MONTH(k.tanggal) = 3 AND YEAR(k.tanggal) = 2026
        `);
        console.log("KEGIATAN MARET:", JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
