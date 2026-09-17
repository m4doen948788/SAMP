const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [tipeUser] = await pool.query('SELECT * FROM master_tipe_user');
        console.log('--- master_tipe_user ---');
        console.table(tipeUser);

        const [jabatan] = await pool.query('SELECT * FROM master_jabatan');
        console.log('\n--- master_jabatan ---');
        console.table(jabatan);

        const [bidang] = await pool.query('SELECT * FROM master_bidang_instansi');
        console.log('\n--- master_bidang_instansi ---');
        console.table(bidang);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
})();
