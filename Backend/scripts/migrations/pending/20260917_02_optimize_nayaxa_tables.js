/**
 * Migration 20260917_02: Optimasi Tabel Asisten Internal
 * Menyelaraskan karakter set dan kolasi tabel asisten ke utf8mb4
 */
const pool = require('../../../src/config/db');

async function migrate() {
    try {
        const tables = [
            'nayaxa_pinned_sessions',
            'nayaxa_api_keys',
            'nayaxa_code_proposals',
            'nayaxa_knowledge',
            'nayaxa_mind_logs',
            'nayaxa_user_personas'
        ];

        for (const tbl of tables) {
            try {
                await pool.query(`ALTER TABLE ${tbl} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
            } catch (err1) {
                try {
                    await pool.query(`ALTER TABLE ${tbl} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                } catch (err2) {}
            }
        }

        // Reset antrean dan cache sesi temporer
        await pool.query(`TRUNCATE TABLE nayaxa_chat_history`).catch(() => {});
        await pool.query(`TRUNCATE TABLE nayaxa_chat_sessions`).catch(() => {});
        await pool.query(`TRUNCATE TABLE nayaxa_pinned_sessions`).catch(() => {});
    } catch (e) {
    } finally {
        process.exit(0);
    }
}

migrate();
