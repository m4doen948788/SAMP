const pool = require('../src/config/db');

async function run() {
    try {
        console.log('--- SEARCHING ALL LOGS ---');
        const [allLogs] = await pool.query('SELECT l.*, b.nama_bidang, i.instansi FROM surat_nomor_log l LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id LEFT JOIN master_instansi_daerah i ON l.instansi_id = i.id ORDER BY l.id DESC LIMIT 10');
        console.log('Last 10 Logs found in DB:');
        console.table(allLogs);

        const [ppmLogs] = await pool.query('SELECT l.* FROM surat_nomor_log l LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id WHERE b.nama_bidang LIKE "%PPM%" OR b.singkatan LIKE "%PPM%"');
        console.log('Logs related to PPM:');
        console.table(ppmLogs);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
