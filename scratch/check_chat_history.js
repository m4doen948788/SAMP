const pool = require('../Backend/src/config/db');

async function checkHistory() {
    try {
        const [rows] = await pool.query('SELECT role, content FROM nayaxa_chat_history ORDER BY created_at DESC LIMIT 5');
        console.log('--- CHAT HISTORY ---');
        rows.reverse().forEach(row => {
            console.log(`[${row.role.toUpperCase()}]: ${row.content.substring(0, 500)}...`);
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
