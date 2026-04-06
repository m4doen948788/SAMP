const pool = require('./src/config/db');
async function check() {
    try {
        const [history] = await pool.query('SELECT * FROM dokumen_edit_history');
        console.log('History Count:', history.length);
        console.log('Sample History:', JSON.stringify(history.slice(0, 5), null, 2));

        const [doumen] = await pool.query('SELECT id, uploaded_at FROM dokumen_upload LIMIT 5');
        console.log('Sample Dokumen IDs:', JSON.stringify(doumen, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
