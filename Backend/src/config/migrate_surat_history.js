const pool = require('./db');

async function migrate() {
    try {
        console.log('🚀 Creating surat_edit_history table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS surat_edit_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                surat_id INT NOT NULL,
                user_id INT NOT NULL,
                aksi VARCHAR(50) NOT NULL,
                keterangan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (surat_id),
                INDEX (user_id)
            )
        `);
        console.log('✅ Table surat_edit_history created successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
