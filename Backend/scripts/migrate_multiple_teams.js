const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration for multiple team selection...');

        // 1. Create pivot table (using MyISAM to match existing tables and avoid errno 150)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS profil_pegawai_sub_bidang (
                id INT AUTO_INCREMENT PRIMARY KEY,
                profil_pegawai_id INT NOT NULL,
                sub_bidang_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_pegawai_sub_bidang (profil_pegawai_id, sub_bidang_id),
                INDEX idx_pegawai (profil_pegawai_id),
                INDEX idx_sub_bidang (sub_bidang_id)
            ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createTableQuery);
        console.log("Table 'profil_pegawai_sub_bidang' created or already exists.");

        // 2. Migrate existing data from profil_pegawai.sub_bidang_id
        console.log('Migrating existing team assignments...');
        const [existingData] = await pool.query('SELECT id, sub_bidang_id FROM profil_pegawai WHERE sub_bidang_id IS NOT NULL');
        
        for (const row of existingData) {
            try {
                await pool.query(
                    'INSERT IGNORE INTO profil_pegawai_sub_bidang (profil_pegawai_id, sub_bidang_id) VALUES (?, ?)',
                    [row.id, row.sub_bidang_id]
                );
            } catch (err) {
                console.error(`Failed to migrate for profil_id ${row.id}:`, err.message);
            }
        }
        
        console.log(`Successfully migrated ${existingData.length} team assignments.`);
        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
