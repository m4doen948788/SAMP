const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Checking pengaturan_aplikasi ---');
        const [rows] = await pool.query('SELECT * FROM pengaturan_aplikasi');
        console.log('Rows found:', rows.length);
        console.table(rows);

        console.log('\n--- Checking kelola_menu (recent changes) ---');
        const [menu] = await pool.query('SELECT * FROM kelola_menu WHERE id > 100');
        console.log('New menu items:');
        console.table(menu);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await pool.end();
    }
})();
