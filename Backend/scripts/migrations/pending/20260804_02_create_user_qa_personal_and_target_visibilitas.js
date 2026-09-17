const pool = require('../../../src/config/db');

const up = async () => {
    try {
        console.log('Starting migration for user_qa_personal table and target_visibilitas column...');

        // 1. Create user_qa_personal table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_qa_personal (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                aplikasi_external_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_app (user_id, aplikasi_external_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('  - Table user_qa_personal verified/created.');

        // 2. Ensure target_visibilitas column exists on master_aplikasi_external
        const [cols] = await pool.query('SHOW COLUMNS FROM master_aplikasi_external');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('target_visibilitas')) {
            await pool.query("ALTER TABLE master_aplikasi_external ADD COLUMN target_visibilitas VARCHAR(50) DEFAULT 'ALL' AFTER is_quick_access");
            console.log('  - Added column target_visibilitas to master_aplikasi_external');
            // Backfill existing data: if is_qa_personal = 1, set to PERSONAL. If is_qa_bidang = 1 and is_qa_all = 0, set to BIDANG. Else ALL.
            await pool.query(`
                UPDATE master_aplikasi_external 
                SET target_visibilitas = CASE 
                    WHEN is_qa_personal = 1 THEN 'PERSONAL'
                    WHEN is_qa_bidang = 1 AND is_qa_all = 0 THEN 'BIDANG'
                    ELSE 'ALL'
                END
            `);
            console.log('  - Backfilled target_visibilitas values for existing rows.');
        }

        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

up().catch(err => {
    console.error('Unhandled migration error:', err);
    process.exit(1);
});
