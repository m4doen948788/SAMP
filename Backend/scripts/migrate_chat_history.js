const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log("--- Melakukan Migrasi Tabel nayaxa_chat_history ---");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS nayaxa_chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                role ENUM('user', 'model') NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Migrasi Berhasil: Tabel nayaxa_chat_history siap digunakan.");
    } catch (e) {
        console.error("Migrasi Gagal:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
