const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Add verification_slug
        await pool.query(`
            ALTER TABLE surat 
            ADD COLUMN IF NOT EXISTS verification_slug VARCHAR(100) UNIQUE,
            ADD COLUMN IF NOT EXISTS integrity_hash TEXT,
            ADD INDEX (verification_slug)
        `);
        
        console.log('Migration successful: Added verification_slug and integrity_hash columns to surat table.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
