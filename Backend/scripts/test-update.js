const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Testing update on ID 1...');
        const [res] = await conn.query(
            'UPDATE master_tipe_kegiatan SET deskripsi = ? WHERE id = ?',
            ['TEST UPDATE ' + new Date().toISOString(), 1]
        );
        console.log('Update result:', res);

        const [rows] = await conn.query('SELECT * FROM master_tipe_kegiatan WHERE id = 1');
        console.log('Updated row:', rows[0]);
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await conn.end();
    }
})();
