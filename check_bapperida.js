const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Backend/.env') });

const check = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [instansi] = await connection.query('SELECT id, instansi FROM master_instansi_daerah WHERE instansi LIKE "%Bapperida%"');
        console.log('Bapperida:', instansi);
        if (instansi.length > 0) {
            const [bidang] = await connection.query('SELECT id, nama_bidang FROM master_bidang_instansi WHERE instansi_id = ?', [instansi[0].id]);
            console.log('Bidang Count for ID ' + instansi[0].id + ':', bidang.length);
            console.log('First 5 Bidang:', bidang.slice(0, 5));
        }
        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
check();
