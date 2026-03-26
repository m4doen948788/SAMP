const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- Current Mapping UI Count ---');
        const [count] = await pool.query('SELECT COUNT(*) as total FROM mapping_urusan_instansi');
        console.table(count);

        console.log('--- Sample Mapping UI ---');
        const [sampleUI] = await pool.query('SELECT * FROM mapping_urusan_instansi LIMIT 5');
        console.table(sampleUI);

        console.log('--- Current Mapping BP Count ---');
        const [countBP] = await pool.query('SELECT COUNT(*) as total FROM mapping_bidang_pengampu');
        console.table(countBP);

        console.log('--- Sample Mapping BP ---');
        const [sampleBP] = await pool.query(`
            SELECT mbp.*, u.urusan, mui.instansi_id, b.nama_bidang
            FROM mapping_bidang_pengampu mbp
            JOIN mapping_urusan_instansi mui ON mbp.mapping_urusan_instansi_id = mui.id
            JOIN master_urusan u ON mui.urusan_id = u.id
            JOIN master_bidang_instansi b ON mbp.bidang_instansi_id = b.id
            LIMIT 5
        `);
        console.table(sampleBP);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
