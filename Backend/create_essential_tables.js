const pool = require('./src/config/db');

async function createEssentials() {
    try {
        console.log('\n--- Creating Essential Foundation Tables ---');

        // 1. pengaturan_aplikasi
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pengaturan_aplikasi (
                pengaturan_key VARCHAR(100) PRIMARY KEY,
                pengaturan_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table pengaturan_aplikasi created.');

        // 2. master_tipe_user
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_tipe_user (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipe_user VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        console.log('✅ Table master_tipe_user created.');

        // Seed Tipe User
        await pool.query("INSERT IGNORE INTO master_tipe_user (id, tipe_user) VALUES (1, 'Super Admin'), (2, 'Admin Instansi'), (3, 'Pegawai')");

        // 3. master_jabatan
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_jabatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                jabatan VARCHAR(255) NOT NULL UNIQUE
            )
        `);
        console.log('✅ Table master_jabatan created.');

        console.log('Foundation tables are ready.');

    } catch (err) {
        console.error('Error creating essentials:', err.message);
    } finally {
        process.exit(0);
    }
}

createEssentials();
