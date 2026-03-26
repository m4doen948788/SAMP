const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // Check if nik exists
        const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'nik'");
        if (cols.length === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN nik VARCHAR(255) NULL AFTER nip");
            console.log("Added nik column");
        } else {
            console.log("nik column already exists");
        }

        // Make nip nullable (if not already)
        await pool.query("ALTER TABLE users MODIFY COLUMN nip VARCHAR(255) NULL");
        console.log("Made nip nullable");

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
