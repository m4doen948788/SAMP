const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Service to permanently delete documents that have been in the trash for more than 30 days.
 */
async function runCleanup() {
    console.log('[CleanupService] Running 30-day document auto-delete cleanup...');
    try {
        // Find documents deleted more than 30 days ago
        const [docs] = await pool.query(`
            SELECT id, path FROM dokumen_upload 
            WHERE is_deleted = 1 
            AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        if (docs.length === 0) {
            console.log('[CleanupService] No expired documents found in trash.');
            return;
        }

        console.log(`[CleanupService] Found ${docs.length} expired documents. Starting permanent deletion...`);

        for (const doc of docs) {
            try {
                // Delete actual file
                const absolutePath = path.join(__dirname, '../../', doc.path);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                    console.log(`[CleanupService] Deleted file: ${doc.path}`);
                }

                // Delete from DB (manual cleanup of relations)
                await pool.query('DELETE FROM dokumen_edit_history WHERE dokumen_id = ?', [doc.id]);
                await pool.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ?', [doc.id]);
                await pool.query('DELETE FROM dokumen_upload WHERE id = ?', [doc.id]);
                
                console.log(`[CleanupService] Removed document ID ${doc.id} from database.`);
            } catch (err) {
                console.error(`[CleanupService] Failed to permanently delete document ID ${doc.id}:`, err.message);
            }
        }

        console.log('[CleanupService] Cleanup task completed.');
    } catch (err) {
        console.error('[CleanupService] Error during cleanup execution:', err.message);
    }
}

/**
 * Starts the cleanup scheduler.
 * Runs once immediately on startup, then every 24 hours.
 */
function startCleanupScheduler() {
    // Run immediately on start
    runCleanup();

    // Schedule to run every 24 hours
    const interval = 24 * 60 * 60 * 1000;
    setInterval(runCleanup, interval);
    
    console.log('[CleanupService] Scheduler started (24h interval).');
}

module.exports = { startCleanupScheduler };
