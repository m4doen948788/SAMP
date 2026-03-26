const pool = require('./src/config/db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute("DESCRIBE nayaxa_chat_history");
        console.log("SCHEMA:", rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkSchema();
