const pool = require('./src/config/db');
async function run() {
    try {
        const tables = ['master_program', 'master_kegiatan', 'master_sub_kegiatan', 'dokumen_upload', 'mapping_urusan_instansi', 'mapping_pemegang_sektor'];
        for (const t of tables) {
            const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${t}`);
            console.log(`${t}: ${rows[0].count}`);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
run();
