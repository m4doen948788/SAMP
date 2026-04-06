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
        console.log('Checking tables...');
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const [config] = await pool.query('SELECT * FROM master_data_config');
        console.log('Master data configs:', config.map(c => ({ id: c.id, label: c.label, nama_tabel: c.nama_tabel })));

        const [masterDokumenDesc] = await pool.query('DESCRIBE master_dokumen').catch(() => [[]]);
        console.log('master_dokumen structure:', masterDokumenDesc);

        const [masterJenisDokumenDesc] = await pool.query('DESCRIBE master_jenis_dokumen').catch(() => [[]]);
        console.log('master_jenis_dokumen structure:', masterJenisDokumenDesc);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
