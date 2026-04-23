const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log("Checking if columns exist...");
        const [columns] = await pool.execute("SHOW COLUMNS FROM nayaxa_chat_history");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('session_id')) {
            console.log("Adding session_id column...");
            await pool.execute("ALTER TABLE nayaxa_chat_history ADD COLUMN session_id VARCHAR(50) DEFAULT 'default' AFTER user_id");
            await pool.execute("ALTER TABLE nayaxa_chat_history ADD INDEX (session_id)");
        }

        if (!columnNames.includes('brain_used')) {
            console.log("Adding brain_used column...");
            await pool.execute("ALTER TABLE nayaxa_chat_history ADD COLUMN brain_used VARCHAR(50) DEFAULT NULL");
        }

        console.log("Migration completed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}
migrate();
