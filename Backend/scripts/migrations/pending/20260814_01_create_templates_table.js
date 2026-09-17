const pool = require('../../../src/config/db');

async function migrate() {
    try {
        console.log('--- Creating table olah_data_templates if not exists ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS olah_data_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'geografis',
                config JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table olah_data_templates created successfully!');
    } catch (e) {
        console.error('Error creating table:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
