const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Creating master_klasifikasi_arsip table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_klasifikasi_arsip (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kode VARCHAR(50) NOT NULL UNIQUE,
                nama TEXT NOT NULL,
                level INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Table created successfully.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
