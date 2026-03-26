const mysql = require('mysql2/promise');
require('dotenv').config();

const checkSystem = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- VIEWS ---');
        const [views] = await pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = DATABASE()");
        console.table(views);

        console.log('\n--- TRIGGERS ---');
        const [triggers] = await pool.query("SHOW TRIGGERS");
        console.table(triggers);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
};
checkSystem();
