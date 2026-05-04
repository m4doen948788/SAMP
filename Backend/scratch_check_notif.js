const pool = require('./src/config/db');

async function checkNotifications() {
    try {
        const [rows] = await pool.query("SHOW TABLES LIKE 'notifications%'");
        console.log('Tables matching notifications:', rows);
        
        const [allTables] = await pool.query("SHOW TABLES");
        console.log('All tables:', allTables.map(t => Object.values(t)[0]));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkNotifications();
