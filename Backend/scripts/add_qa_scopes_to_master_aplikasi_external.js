const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding is_qa_all, is_qa_bidang, is_qa_personal columns to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const fieldSet = new Set(cols.map(c => c.Field));

    if (!fieldSet.has('is_qa_all')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_qa_all TINYINT(1) DEFAULT 0 AFTER is_quick_access');
      console.log('✅ Added column is_qa_all.');
    }
    if (!fieldSet.has('is_qa_bidang')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_qa_bidang TINYINT(1) DEFAULT 0 AFTER is_qa_all');
      console.log('✅ Added column is_qa_bidang.');
    }
    if (!fieldSet.has('is_qa_personal')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_qa_personal TINYINT(1) DEFAULT 0 AFTER is_qa_bidang');
      console.log('✅ Added column is_qa_personal.');
    }

    // Migrate existing is_quick_access = 1 to is_qa_bidang = 1 & is_qa_all = 1
    await pool.query('UPDATE master_aplikasi_external SET is_qa_bidang = 1, is_qa_all = 1 WHERE is_quick_access = 1');
    console.log('✅ Migrated existing is_quick_access records.');

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
