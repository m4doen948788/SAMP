const mysql = require('mysql2/promise');
require('dotenv').config();

const check = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [instansi] = await pool.query('SELECT id, instansi FROM master_instansi_daerah WHERE instansi LIKE "%BAP%"');
        console.log('Bap-related instansi:', instansi);

        const [bidang] = await pool.query('SELECT id, nama_bidang, instansi_id FROM master_bidang_instansi LIMIT 5');
        console.log('Sample bidang:', bidang);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
check();
