const pool = require('../src/config/db');

async function findMenuTable() {
    try {
        const [tables] = await pool.query("SHOW TABLES LIKE '%menu%'");
        tables.forEach(t => {
            console.log('TABLE_NAME_MATCH:', Object.values(t)[0]);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

findMenuTable();
