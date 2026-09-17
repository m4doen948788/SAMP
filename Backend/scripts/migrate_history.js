const pool = require('./src/config/db');
async function migrate() {
    try {
        const [docs] = await pool.query('SELECT id, uploaded_by, uploaded_at FROM dokumen_upload');
        for (const doc of docs) {
            const [history] = await pool.query('SELECT id FROM dokumen_edit_history WHERE dokumen_id = ?', [doc.id]);
            if (history.length === 0) {
                await pool.query(
                    'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan, created_at) VALUES (?, ?, ?, ?, ?)',
                    [doc.id, doc.uploaded_by, 'upload', 'File diupload pertama kali', doc.uploaded_at]
                );
                console.log(`Added initial history for doc ID ${doc.id}`);
            }
        }
        console.log('Migration complete.');
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
migrate();
