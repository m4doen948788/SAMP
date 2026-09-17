const pool = require('./src/config/db');

async function migrate() {
    console.log('Migrating bidang_id to bidang_ids in kegiatan_manajemen...');
    try {
        // Check if bidang_ids already exists
        const [cols] = await pool.query('DESCRIBE kegiatan_manajemen');
        const hasBidangIds = cols.some(c => c.Field === 'bidang_ids');
        const hasBidangId = cols.some(c => c.Field === 'bidang_id');

        if (!hasBidangIds && hasBidangId) {
            console.log('Renaming bidang_id to bidang_ids and changing type to TEXT...');
            // First change type to TEXT (MySQL allows renaming while changing type if using ALTER TABLE ... CHANGE)
            // But to be safe on all versions, we'll ADD and then MOVE data if needed, or just RENAME.
            await pool.query('ALTER TABLE kegiatan_manajemen CHANGE COLUMN bidang_id bidang_ids TEXT DEFAULT NULL');
            console.log('Column renamed and type changed.');
        } else if (!hasBidangIds && !hasBidangId) {
            console.log('Creating bidang_ids column...');
            await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN bidang_ids TEXT DEFAULT NULL');
        } else {
            console.log('bidang_ids already exists.');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
