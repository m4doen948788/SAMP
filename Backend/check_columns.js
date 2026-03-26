const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/.env' });

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const [cols] = await p.query("DESCRIBE mapping_urusan_instansi");
    console.log('Columns in mapping_urusan_instansi:', JSON.stringify(cols.map(c => c.Field)));

    await p.end();
})();
