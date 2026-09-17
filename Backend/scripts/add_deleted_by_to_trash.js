const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Starting migration for adding deleted_by to trash...');

        // Add 'deleted_by' to dokumen_upload
        await pool.query(`
            ALTER TABLE dokumen_upload 
            ADD COLUMN IF NOT EXISTS deleted_by INT NULL
        `);
        console.log('Added deleted_by column to dokumen_upload');

        // Add 'deleted_by' to surat
        await pool.query(`
            ALTER TABLE surat 
            ADD COLUMN IF NOT EXISTS deleted_by INT NULL
        `);
        console.log('Added deleted_by column to surat');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
