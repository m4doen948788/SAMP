const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Simple count check
        const instansiId = 11; // We know this exists from previous runs
        const bidangId = 44; // Example

        const [total] = await conn.query('SELECT COUNT(*) as c FROM profil_pegawai');
        console.log('Total:', total[0].c);

        const [instansi] = await conn.query('SELECT COUNT(*) as c FROM profil_pegawai WHERE instansi_id = ?', [instansiId]);
        console.log('Instansi 11:', instansi[0].c);

        const [bidang] = await conn.query('SELECT COUNT(*) as c FROM profil_pegawai WHERE instansi_id = ? AND bidang_id = ?', [instansiId, bidangId]);
        console.log('Instansi 11, Bidang 44:', bidang[0].c);

    } catch (e) {
        console.error(e);
    } finally {
        if (conn) await conn.end();
    }
}
run();
