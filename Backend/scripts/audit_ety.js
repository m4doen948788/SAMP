const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Profil Bu Ety ---");
        const [pegawai] = await pool.query('SELECT id, nama_lengkap, jabatan_id, bidang_id, sub_bidang_id FROM profil_pegawai WHERE nama_lengkap LIKE "%Ety%"');
        console.log("PEGAWAI ETY:", JSON.stringify(pegawai, null, 2));

        if (pegawai.length > 0 && pegawai[0].sub_bidang_id) {
            const [sb] = await pool.query('SELECT * FROM master_sub_bidang_instansi WHERE id = ?', [pegawai[0].sub_bidang_id]);
            console.log("SUB BIDANG (TIM):", JSON.stringify(sb, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
