const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Add verification_slug column robustly
        try {
            await pool.query('ALTER TABLE surat ADD COLUMN verification_slug VARCHAR(100) UNIQUE');
            console.log('✅ Added verification_slug column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ Column verification_slug already exists, skipping.');
            else throw e;
        }

        // Add integrity_hash column robustly
        try {
            await pool.query('ALTER TABLE surat ADD COLUMN integrity_hash TEXT');
            console.log('✅ Added integrity_hash column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ Column integrity_hash already exists, skipping.');
            else throw e;
        }

        // Add index robustly
        try {
            await pool.query('ALTER TABLE surat ADD INDEX (verification_slug)');
            console.log('✅ Added index on verification_slug.');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate key name')) {
                console.log('ℹ️ Index on verification_slug already exists, skipping.');
            } else throw e;
        }
        
        console.log('Migration successful: Database schema is fully up-to-date.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();


