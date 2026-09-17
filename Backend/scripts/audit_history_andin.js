const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Chat History Andin ---");
        const [rows] = await pool.query('SELECT * FROM nayaxa_chat_history WHERE user_id = 4 ORDER BY created_at DESC LIMIT 10');
        console.log("HISTORY ANDIN:", JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
