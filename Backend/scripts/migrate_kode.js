const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Adding kode column to data_makro...');
        await pool.query(`
            ALTER TABLE data_makro ADD COLUMN IF NOT EXISTS kode VARCHAR(255) AFTER id
        `);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
