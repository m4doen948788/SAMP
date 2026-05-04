const pool = require('../Backend/src/config/db');

async function cleanUp() {
    try {
        const [rows] = await pool.query('SELECT id FROM surat_global_settings WHERE instansi_id IS NULL ORDER BY id DESC');
        console.log('Found ' + rows.length + ' global settings records with NULL instansi_id');
        
        if (rows.length > 1) {
            const idsToDelete = rows.slice(1).map(r => r.id);
            console.log('Deleting duplicate IDs:', idsToDelete);
            await pool.query('DELETE FROM surat_global_settings WHERE id IN (?)', [idsToDelete]);
            console.log('Cleanup successful.');
        } else {
            console.log('No duplicates to clean.');
        }
        process.exit();
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanUp();
