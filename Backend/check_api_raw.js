const mysql = require('mysql2/promise');
require('dotenv').config();

const checkApiRaw = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await pool.query(`
            SELECT u.id as urusan_id, u.urusan as nama_urusan, m.id, m.instansi_id, i.instansi as nama_instansi, i.singkatan as singkatan_instansi
            FROM master_urusan u
            LEFT JOIN mapping_urusan_instansi m ON u.id = m.urusan_id
            LEFT JOIN master_instansi_daerah i ON m.instansi_id = i.id
            ORDER BY u.urusan ASC, i.instansi ASC
        `);

        console.log('Total rows returned:', rows.length);
        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
        } else {
            console.log('WARNING: ZERO ROWS RETURNED');
            const [uCount] = await pool.query('SELECT COUNT(*) as count FROM master_urusan');
            console.log('Urusan count in DB:', uCount[0].count);
        }

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkApiRaw();
