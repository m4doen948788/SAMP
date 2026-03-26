const pool = require('./config/db');

async function listTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.log('Tables in database:');
        rows.forEach(row => console.log(Object.values(row)[0]));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

listTables();
