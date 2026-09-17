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
        const [c] = await pool.query('DESCRIBE kelola_menu');
        console.log(JSON.stringify(c, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
})();
