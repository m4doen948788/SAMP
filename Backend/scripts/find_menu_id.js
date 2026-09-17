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
        const [m] = await pool.query('SELECT id, nama_menu, action_page FROM kelola_menu WHERE nama_menu LIKE "%Perencanaan%" OR action_page LIKE "%referensi%" OR action_page LIKE "%mapping%"');
        console.log(JSON.stringify(m, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
})();
