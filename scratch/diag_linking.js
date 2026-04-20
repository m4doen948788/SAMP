const pool = require('../Backend/src/config/db');

async function diag() {
    try {
        console.log('--- Checking Activity ID 5 Mapping ---');
        const [kegiatan] = await pool.query('SELECT * FROM kegiatan_manajemen WHERE id = 5');
        console.log('Kegiatan 5:', JSON.stringify(kegiatan[0], null, 2));

        console.log('--- Checking kegiatan_manajemen_dokumen for Kegiatan 5 ---');
        const [docs] = await pool.query('SELECT * FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = 5');
        console.log('Related Documents:', JSON.stringify(docs, null, 2));

        console.log('--- Checking Surat record with dokumen_id = 66 ---');
        const [surat] = await pool.query('SELECT * FROM surat WHERE dokumen_id = 66');
        console.log('Surat 66:', JSON.stringify(surat[0], null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
diag();
