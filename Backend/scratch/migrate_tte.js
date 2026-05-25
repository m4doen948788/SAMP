const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Add verification_slug (Standard MySQL compatible)
        await pool.query(`
            ALTER TABLE surat 
            ADD COLUMN verification_slug VARCHAR(100) UNIQUE,
            ADD COLUMN integrity_hash TEXT,
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

