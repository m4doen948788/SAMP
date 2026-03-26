const pool = require('./config/db');

async function migrate() {
    try {
        console.log('--- Adding parent_id to master_urusan ---');
        await pool.query('ALTER TABLE master_urusan ADD COLUMN IF NOT EXISTS parent_id INT NULL AFTER kode_urusan');
        
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
