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
        const [r1] = await conn.execute('SELECT * FROM generated_pages LIMIT 5');
        console.log("--- generated_pages ---");
        console.log(JSON.stringify(r1, null, 2));
        const [r2] = await conn.execute('SELECT * FROM kelola_menu LIMIT 10');
        console.log("--- kelola_menu ---");
        console.log(JSON.stringify(r2, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
    process.exit(0);
}
check();
