const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration for Document Trash Bin...');

        // Add 'is_deleted' and 'deleted_at' to dokumen_upload
        await pool.query(`
            ALTER TABLE dokumen_upload 
            ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL
        `);
        console.log('Added is_deleted and deleted_at columns to dokumen_upload');

        // Update 'aksi' ENUM in dokumen_edit_history
        // MySQL/MariaDB doesn't support 'IF NOT EXISTS' for MODIFY/CHANGE ENUM easily, 
        // but we can just update it safely if it doesn't have it.
        await pool.query(`
            ALTER TABLE dokumen_edit_history 
            MODIFY COLUMN aksi ENUM('upload', 'edit', 'delete', 'restore') DEFAULT 'edit'
        `);
        console.log('Updated aksi ENUM in dokumen_edit_history');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
