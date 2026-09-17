const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/.env' });

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const [tables] = await p.query("SHOW TABLES LIKE '%mapping%'");
    console.log('Mapping Tables:', JSON.stringify(tables.map(t => Object.values(t)[0])));

    await p.end();
})();
