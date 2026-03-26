const pool = require('./src/config/db');

async function run() {
    try {
        console.log('=== Migration: Add jabatan & sub_bidang support ===');

        // 1. Create master_jabatan table
        console.log('Creating master_jabatan table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_jabatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                jabatan VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('master_jabatan table created.');

        // 2. Seed default jabatan data
        const jabatanList = [
            'Kepala',
            'Kepala Sub Bagian',
            'Kepala Bidang',
            'Kepala Seksi',
            'Sekretaris',
            'Staf',
            'Fungsional'
        ];

        for (const nama of jabatanList) {
            const [existing] = await pool.query('SELECT id FROM master_jabatan WHERE jabatan = ?', [nama]);
            if (existing.length === 0) {
                await pool.query('INSERT INTO master_jabatan (jabatan) VALUES (?)', [nama]);
                console.log(`  Seeded jabatan: ${nama}`);
            } else {
                console.log(`  Jabatan already exists: ${nama}`);
            }
        }

        // 3. Add jabatan_id column to users table
        try {
            await pool.query('ALTER TABLE users ADD COLUMN jabatan_id INT DEFAULT NULL');
            console.log('Added jabatan_id column to users.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('jabatan_id column already exists in users.');
            } else {
                throw e;
            }
        }

        // 4. Add sub_bidang_id column to users table
        try {
            await pool.query('ALTER TABLE users ADD COLUMN sub_bidang_id INT DEFAULT NULL');
            console.log('Added sub_bidang_id column to users.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('sub_bidang_id column already exists in users.');
            } else {
                throw e;
            }
        }

        console.log('=== Migration complete ===');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
