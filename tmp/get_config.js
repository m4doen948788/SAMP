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
        if (config.length > 0) {
            console.log('CONFIG_START');
            console.log(JSON.stringify(config[0], null, 2));
            console.log('CONFIG_END');
        } else {
            console.log('CONFIG_NOT_FOUND');
        }

        const [tables] = await pool.query('SHOW TABLES');
        console.log('TABLES_START');
        console.log(tables.map(t => Object.values(t)[0]).join(','));
        console.log('TABLES_END');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
