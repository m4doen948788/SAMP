const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Creating data_makro_otoritas table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_otoritas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                profil_pegawai_id INT NOT NULL,
                UNIQUE KEY uniq_otoritas (profil_pegawai_id)
            )
        `);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
