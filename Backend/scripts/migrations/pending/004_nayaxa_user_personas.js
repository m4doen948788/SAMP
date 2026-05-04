/**
 * Migration 004: Nayaxa User Personas Table
 * Membuat tabel untuk menyimpan persona/karakter AI yang dikustomisasi per user
 */
const pool = require('../../../src/config/db');

async function migrate() {
    try {
        console.log('--- [004] Membuat tabel nayaxa_user_personas ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS nayaxa_user_personas (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL UNIQUE,
                user_name   VARCHAR(255),
                persona_text TEXT,
                updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id)
            )
        `);
        console.log('✅ Tabel nayaxa_user_personas siap.');
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
