const pool = require('./src/config/db');

async function migrate() {
    console.log('Adding urusan_ids column to kegiatan_manajemen...');
    try {
        const [cols] = await pool.query('DESCRIBE kegiatan_manajemen');
        const hasUrusanIds = cols.some(c => c.Field === 'urusan_ids');

        if (!hasUrusanIds) {
            console.log('Adding urusan_ids column...');
            await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN urusan_ids TEXT NULL');
            console.log('urusan_ids column added.');
        } else {
            console.log('urusan_ids column already exists.');
        }
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();