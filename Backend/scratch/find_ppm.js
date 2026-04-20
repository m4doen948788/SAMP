const mysql = require('mysql2/promise');

async function run() {
    const config = {
        host: 'kasibah.com',
        user: 'kasibahc_dashboard_ppm',
        password: 'eW7UFcbuRrJmKECk5mNz',
        database: 'kasibahc_dashboard_ppm'
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('CONNECTED TO DB');

        console.log('--- RECENT NOMOR LOGS (ALL) ---');
        const [logs] = await connection.query('SELECT * FROM surat_nomor_log ORDER BY id DESC LIMIT 20');
        console.table(logs);

        console.log('--- SEARCHING FOR PPM IN LOGS ---');
        const [ppmLogs] = await connection.query('SELECT l.* FROM surat_nomor_log l LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id WHERE b.nama_bidang LIKE "%PPM%" OR b.singkatan LIKE "%PPM%"');
        console.table(ppmLogs);

        console.log('--- CHECKING COUNTERS ---');
        const [counters] = await connection.query('SELECT * FROM surat_counters WHERE last_number > 0 ORDER BY last_number DESC LIMIT 10');
        console.table(counters);

        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error('DB ERROR:', e);
        process.exit(1);
    }
}

run();
