const pool = require('../../src/config/db');

const up = async () => {
    try {
        console.log('🔄 Adding file columns to rpjpd_visi table...');
        await pool.query(`
            ALTER TABLE rpjpd_visi 
            ADD COLUMN file_path VARCHAR(255) NULL AFTER visi,
            ADD COLUMN file_name VARCHAR(255) NULL AFTER file_path
        `);
        console.log('✅ Columns file_path and file_name added to rpjpd_visi successfully.');
        process.exit(0);
    } catch (err) {
        // If columns already exist (e.g. if rerun), swallow the error and exit successfully
        if (err.code === 'ER_DUP_COLUMNNAME' || err.code === 'ER_DUP_FIELDNAME' || (err.message && err.message.includes('Duplicate column name'))) {
            console.log('⏭️  Columns file_path and file_name already exist.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

up().catch(err => {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
});
