const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/.env' });

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding columns for multi-meeting support...');

        // Add columns if they don't exist
        await pool.query(`
            ALTER TABLE kegiatan_harian_pegawai 
            ADD COLUMN IF NOT EXISTS id_kegiatan_eksternal VARCHAR(100) DEFAULT '',
            ADD COLUMN IF NOT EXISTS nama_kegiatan TEXT
        `);

        console.log('Updating unique constraint...');

        // Drop old unique key if it exists
        try {
            await pool.query('ALTER TABLE kegiatan_harian_pegawai DROP INDEX unique_pegawai_tanggal_sesi');
        } catch (e) {
            console.log('Old index unique_pegawai_tanggal_sesi not found or already dropped.');
        }

        // Add new unique key including external ID
        await pool.query(`
            ALTER TABLE kegiatan_harian_pegawai 
            ADD UNIQUE INDEX unique_kegiatan_multi (profil_pegawai_id, tanggal, sesi, id_kegiatan_eksternal)
        `);

        console.log('Database migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
