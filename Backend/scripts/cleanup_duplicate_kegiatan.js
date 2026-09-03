/**
 * One-time Database Cleanup: Remove duplicate logbook entries
 * Run once on VPS database to clean up any duplicate entries.
 * Usage: node Backend/scripts/cleanup_duplicate_kegiatan.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

async function cleanup() {
    console.log('[Cleanup] Starting cleanup of duplicate logbook entries...');
    try {
        const [result] = await pool.query(`
            DELETE k1 FROM kegiatan_harian_pegawai k1
            INNER JOIN kegiatan_harian_pegawai k2 
            ON k1.profil_pegawai_id = k2.profil_pegawai_id 
            AND k1.tanggal = k2.tanggal 
            AND k1.sesi = k2.sesi 
            AND k1.tipe_kegiatan = k2.tipe_kegiatan
            WHERE k1.id > k2.id
        `);
        console.log(`[Cleanup] Done! Cleaned up duplicate entries.`);
        console.log(`[Cleanup] Affected/removed rows: ${result.affectedRows}`);
    } catch (err) {
        console.error('[Cleanup] FAILED:', err.message);
    } finally {
        process.exit(0);
    }
}

cleanup();
