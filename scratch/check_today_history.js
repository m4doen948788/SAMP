const pool = require('../Backend/src/config/db');

async function checkTodayHistory() {
    try {
        const [rows] = await pool.query("SELECT role, content, created_at FROM nayaxa_chat_history WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC");
        console.log(`--- TODAY'S CHAT HISTORY (${rows.length} messages) ---`);
        rows.forEach(row => {
            console.log(`[${row.created_at}] [${row.role.toUpperCase()}]: ${row.content.substring(0, 500)}...`);
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

checkTodayHistory();
