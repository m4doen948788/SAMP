const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Backend/.env') });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [config] = await pool.query("SELECT * FROM master_data_config WHERE nama_tabel = 'master_dokumen'");
        console.log('CONFIG:', JSON.stringify(config[0], null, 2));

        const [tables] = await pool.query("DESCRIBE master_dokumen");
        console.log('DESCRIBE master_dokumen:', tables);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
