/**
 * Migration 005: Nayaxa Pinned Sessions Table
 * Membuat tabel untuk menyimpan session chat yang di-pin oleh user
 */
const pool = require('../../../src/config/db');

async function migrate() {
    try {
        console.log('--- [005] Membuat tabel nayaxa_pinned_sessions ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS nayaxa_pinned_sessions (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                app_id      INT NOT NULL DEFAULT 1,
                user_id     INT NOT NULL,
                session_id  VARCHAR(50) NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_pin (user_id, session_id),
                INDEX (user_id),
                INDEX (session_id)
            )
        `);
        console.log('✅ Tabel nayaxa_pinned_sessions siap.');
    } catch (e) {
        if (e.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️  Tabel sudah ada, melewati.');
        } else {
            console.error('❌ Error:', e.message);
            process.exit(1);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
