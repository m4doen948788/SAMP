const mysql = require('mysql2/promise');
require('dotenv').config();

const checkUrusan = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const query = 'SELECT id, urusan, bidang_bapperida_id FROM master_urusan WHERE urusan LIKE "%Administrasi Kependudukan%"';
        const [rows] = await pool.query(query);
        console.log('Urusan:', rows);

        if (rows.length > 0) {
            const urusanId = rows[0].id;
            const [mappings] = await pool.query('SELECT * FROM mapping_urusan_instansi WHERE urusan_id = ?', [urusanId]);
            console.log('Mappings:', mappings);

            const [bidang] = await pool.query('SELECT id, nama_bidang FROM master_bidang_instansi WHERE id = ?', [rows[0].bidang_bapperida_id]);
            console.log('Selected Bidang:', bidang);
        }
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};

checkUrusan();
