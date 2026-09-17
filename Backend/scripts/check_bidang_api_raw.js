const mysql = require('mysql2/promise');
require('dotenv').config();

const checkBidangApiRaw = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await pool.query(`
            SELECT mbp.*, 
                   u.urusan as nama_urusan, 
                   bi.nama_bidang as nama_bidang_pengampu,
                   bi.singkatan as singkatan_bidang,
                   'Badan Perencanaan Pembangunan dan Riset Daerah' as nama_instansi
            FROM mapping_bidang_pengampu mbp
            JOIN master_urusan u ON mbp.urusan_id = u.id
            JOIN master_bidang_instansi bi ON mbp.bidang_instansi_id = bi.id
            ORDER BY u.urusan ASC, bi.nama_bidang ASC
        `);

        console.log('Total bidang mapping rows:', rows.length);
        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
        }

        await pool.end();
    } catch (err) {
        console.error('Error detail:', err);
    }
};
checkBidangApiRaw();
