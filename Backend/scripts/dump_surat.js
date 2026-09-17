const mysql = require('mysql2/promise');
require('dotenv').config({ path: './Backend/.env' });

async function dumpSurat() {
    console.log('--- DB CONFIG ---');
    console.log('HOST:', process.env.DB_HOST);
    console.log('DB:', process.env.DB_NAME);

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Connecting...');
        const [all] = await pool.query('SELECT * FROM surat LIMIT 10');
        console.log('Recent 10 records in surat:');
        console.table(all.map(s => ({
            id: s.id,
            nomor: s.nomor_surat,
            tipe: s.tipe_surat,
            inst_id: s.instansi_id,
            bid_id: s.bidang_id,
            dok_id: s.dokumen_id
        })));

        const [counts] = await pool.query('SELECT instansi_id, count(*) as count FROM surat GROUP BY instansi_id');
        console.log('Instansi Distribution:');
        console.table(counts);

    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        await pool.end();
    }
}

dumpSurat();
