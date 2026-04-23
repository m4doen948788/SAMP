const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration: Adding keterangan column to kegiatan_manajemen...');
        
        // Check if column already exists
        const [cols] = await pool.query('SHOW COLUMNS FROM kegiatan_manajemen LIKE "keterangan"');
        
        if (cols.length === 0) {
            await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN keterangan TEXT AFTER kelengkapan');
            console.log('✅ Column "keterangan" added to "kegiatan_manajemen".');
        } else {
            console.log('ℹ️ Column "keterangan" already exists.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
