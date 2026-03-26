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

        console.log('--- PROFIL_PEGAWAI WITH BIDANG ---');
        const [rows] = await db.execute(`
            SELECT pp.nama_lengkap, pp.bidang_id, pp.sub_bidang_id,
                   mb.nama_bidang as master_bidang_name,
                   mbi.nama_bidang as master_bidang_instansi_name
            FROM profil_pegawai pp
            LEFT JOIN master_bidang mb ON pp.bidang_id = mb.id
            LEFT JOIN master_bidang_instansi mbi ON pp.bidang_id = mbi.id
            WHERE pp.bidang_id IS NOT NULL 
            LIMIT 10
        `);
        console.log(JSON.stringify(rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (db) await db.end();
    }
}

run();
