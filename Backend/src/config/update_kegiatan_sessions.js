const pool = require('./db');

async function updateKegiatanSessions() {
    try {
        console.log('Starting migration: split kegiatan into Pagi/Siang sessions...');

        // 1. Add sesi column
        await pool.query(`
            ALTER TABLE kegiatan_harian_pegawai 
            ADD COLUMN sesi ENUM('Pagi', 'Siang') NOT NULL DEFAULT 'Pagi' AFTER tanggal
        `);
        console.log('Added sesi column.');

        // 2. Drop old unique key
        try {
            await pool.query(`
                ALTER TABLE kegiatan_harian_pegawai 
                DROP INDEX unique_pegawai_tanggal
            `);
            console.log('Dropped old unique index unique_pegawai_tanggal.');
        } catch (e) {
            console.warn('Could not drop unique_pegawai_tanggal (might not exist):', e.message);
        }

        // 3. Add new unique key including sesi
        await pool.query(`
            ALTER TABLE kegiatan_harian_pegawai 
            ADD UNIQUE KEY unique_pegawai_tanggal_sesi (profil_pegawai_id, tanggal, sesi)
        `);
        console.log('Added new composite unique index (profil_pegawai_id, tanggal, sesi).');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

updateKegiatanSessions();
