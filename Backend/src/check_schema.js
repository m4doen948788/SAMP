const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- master_urusan ---');
        const [urusan] = await pool.query('DESCRIBE master_urusan');
        console.table(urusan);

        console.log('--- mapping_urusan_instansi ---');
        const [mapping] = await pool.query('DESCRIBE mapping_urusan_instansi');
        console.table(mapping);

        console.log('--- mapping_bidang_pengampu ---');
        const [bp] = await pool.query('DESCRIBE mapping_bidang_pengampu');
        console.table(bp);

        console.log('--- master_instansi_daerah ---');
        const [instansi] = await pool.query('SELECT id, instansi, singkatan FROM master_instansi_daerah WHERE id = 2');
        console.table(instansi);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
