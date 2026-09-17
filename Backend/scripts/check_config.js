const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    try {
        const [rows] = await conn.execute('SELECT * FROM master_data_config');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.log("Table master_data_config might not exist or empty:", e.message);
    }
    process.exit(0);
}
check();
