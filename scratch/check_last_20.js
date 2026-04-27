const pool = require('../Backend/src/config/db');

async function checkRecentHistory() {
    try {
        const [rows] = await pool.query("SELECT role, content, created_at FROM nayaxa_chat_history ORDER BY created_at DESC LIMIT 20");
        console.log(`--- RECENT CHAT HISTORY (Last 20 messages) ---`);
        rows.forEach(row => {
            console.log(`[${row.created_at}] [${row.role.toUpperCase()}]: ${row.content.substring(0, 300)}...`);
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

checkRecentHistory();
