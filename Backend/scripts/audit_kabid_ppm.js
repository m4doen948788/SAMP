const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Kabid PPM ---");
        const [jab] = await pool.query('SELECT id, jabatan FROM master_jabatan WHERE jabatan LIKE "%Kepala Bidang%"');
        console.log("JABATAN KABID:", JSON.stringify(jab, null, 2));

        const [bid] = await pool.query('SELECT id, nama_bidang FROM master_bidang_instansi WHERE nama_bidang LIKE "%Pemerintahan%" OR singkatan = "PPM"');
        console.log("BIDANG PPM:", JSON.stringify(bid, null, 2));

        if (jab.length > 0 && bid.length > 0) {
            const jab_ids = jab.map(j => j.id);
            const bid_ids = bid.map(b => b.id);
            const [peg] = await pool.query('SELECT id, nama_lengkap, jabatan_id, bidang_id FROM profil_pegawai WHERE jabatan_id IN (?) AND bidang_id IN (?)', [jab_ids, bid_ids]);
            console.log("PEGAWAI KABID PPM:", JSON.stringify(peg, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
