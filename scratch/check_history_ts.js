const pool = require('../Backend/src/config/db');

async function checkHistory() {
    try {
        const [rows] = await pool.query('SELECT role, content, created_at FROM nayaxa_chat_history ORDER BY created_at DESC LIMIT 10');
        console.log('--- LATEST CHAT HISTORY WITH TIMESTAMP ---');
        rows.reverse().forEach(row => {
            console.log(`[${row.created_at}] [${row.role.toUpperCase()}]: ${row.content.substring(0, 200)}...`);
            console.log('---');
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkHistory();
