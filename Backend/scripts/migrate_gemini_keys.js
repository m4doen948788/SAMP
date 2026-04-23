const pool = require('./src/config/db');

async function migrate() {
    try {
        // 1. Create table gemini_api_keys
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gemini_api_keys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(255) NOT NULL,
                api_key TEXT NOT NULL,
                is_active TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table gemini_api_keys created or already exists.');

        // 2. Migrate existing key from pengaturan_aplikasi if exists
        const [rows] = await pool.query('SELECT pengaturan_value FROM pengaturan_aplikasi WHERE pengaturan_key = "gemini_api_key"');
        if (rows.length > 0 && rows[0].pengaturan_value) {
            const existingKey = rows[0].pengaturan_value;
            // Check if already migrated
            const [check] = await pool.query('SELECT id FROM gemini_api_keys WHERE api_key = ?', [existingKey]);
            if (check.length === 0) {
                await pool.query(
                    'INSERT INTO gemini_api_keys (label, api_key, is_active) VALUES ("Key Utama (Migrasi)", ?, 1)',
                    [existingKey]
                );
                console.log('Existing key migrated to gemini_api_keys.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
