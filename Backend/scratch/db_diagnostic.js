const pool = require('./src/config/db');

async function diagnostic() {
    try {
        console.log('Attempting to connect to DB...');
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('DB Connection successful. Result:', rows[0].result);
        
        console.log('Checking tables...');
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables found:', tables.length);
        
        process.exit(0);
    } catch (err) {
        console.error('DB Diagnostic Failed:');
        console.error(err);
        process.exit(1);
    }
}

diagnostic();
