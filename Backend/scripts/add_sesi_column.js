const pool = require('./src/config/db');

async function migrate() {
    console.log('Adding sesi column to kegiatan_manajemen...');
    try {
        const [cols] = await pool.query('DESCRIBE kegiatan_manajemen');
        const hasSesi = cols.some(c => c.Field === 'sesi');

        if (!hasSesi) {
            console.log('Adding sesi column...');
            await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN sesi VARCHAR(50) DEFAULT NULL');
            console.log('Sesi column added.');
        } else {
            console.log('Sesi column already exists.');
        }
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
