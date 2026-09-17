const mysql = require('mysql2/promise');
require('dotenv').config();

const debugMapping = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- MAPPING URUSAN INSTANSI (Internal ID 2) ---');
        const [mui] = await pool.query('SELECT m.*, u.urusan FROM mapping_urusan_instansi m JOIN master_urusan u ON m.urusan_id = u.id WHERE m.instansi_id = 2');
        console.log(mui);

        console.log('\n--- MAPPING BIDANG PENGAMPU ---');
        const [mbp] = await pool.query(`
            SELECT mbp.*, u.urusan, i.instansi 
            FROM mapping_bidang_pengampu mbp
            JOIN mapping_urusan_instansi mui ON mbp.mapping_urusan_instansi_id = mui.id
            JOIN master_urusan u ON mui.urusan_id = u.id
            JOIN master_instansi_daerah i ON mui.instansi_id = i.id
        `);
        console.log(mbp);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
debugMapping();
