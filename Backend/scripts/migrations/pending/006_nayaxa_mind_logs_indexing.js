/**
 * Migration 006: Nayaxa Mind Logs + Dokumen Indexing
 * - Membuat tabel nayaxa_mind_logs untuk tracking task background AI
 * - Menambah kolom is_indexed ke dokumen_upload untuk tracking status indexing
 */
const pool = require('../../../src/config/db');

async function migrate() {
    try {
        // Step 1: Tambah kolom is_indexed ke dokumen_upload
        console.log('--- [006] Menambah kolom is_indexed ke dokumen_upload ---');
        try {
            await pool.query(`
                ALTER TABLE dokumen_upload 
                ADD COLUMN is_indexed TINYINT(1) DEFAULT 0
            `);
            console.log('✅ Kolom is_indexed berhasil ditambahkan ke dokumen_upload.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ️  Kolom is_indexed sudah ada di dokumen_upload, melewati.');
            } else {
                throw e;
            }
        }

        // Step 2: Buat tabel nayaxa_mind_logs
        console.log('--- [006] Membuat tabel nayaxa_mind_logs ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS nayaxa_mind_logs (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                task_name   VARCHAR(255),
                status      VARCHAR(50),
                message     TEXT,
                started_at  DATETIME,
                finished_at DATETIME
            )
        `);
        console.log('✅ Tabel nayaxa_mind_logs siap.');

    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
