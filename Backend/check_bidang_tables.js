const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- MASTER_BIDANG ---');
        try {
            const [rows] = await db.execute('DESCRIBE master_bidang');
            console.log(JSON.stringify(rows, null, 2));
            const [data] = await db.execute('SELECT * FROM master_bidang');
            console.log('Count:', data.length);
            console.log('Sample:', JSON.stringify(data.slice(0, 3), null, 2));
        } catch (e) { console.log('Error master_bidang:', e.message); }

        console.log('\n--- MASTER_SUB_BIDANG_INSTANSI ---');
        try {
            const [rows] = await db.execute('DESCRIBE master_sub_bidang_instansi');
            console.log(JSON.stringify(rows, null, 2));
            const [data] = await db.execute('SELECT * FROM master_sub_bidang_instansi');
            console.log('Count:', data.length);
            console.log('Sample:', JSON.stringify(data.slice(0, 3), null, 2));
        } catch (e) { console.log('Error master_sub_bidang_instansi:', e.message); }

    } catch (err) {
        console.error('Connection Error:', err);
    } finally {
        if (db) await db.end();
    }
}

run();
