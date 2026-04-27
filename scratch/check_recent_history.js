const pool = require('../Backend/src/config/db');

async function checkRecentHistory() {
    try {
        const [rows] = await pool.query("SELECT role, content, created_at FROM nayaxa_chat_history WHERE created_at > NOW() - INTERVAL 10 MINUTE ORDER BY created_at DESC");
        console.log(`--- RECENT CHAT HISTORY (Last 10 min: ${rows.length} messages) ---`);
        rows.forEach(row => {
            console.log(`[${row.created_at}] [${row.role.toUpperCase()}]: ${row.content}`);
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
