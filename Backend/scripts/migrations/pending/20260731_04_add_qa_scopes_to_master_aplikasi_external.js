const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log('🔄 Running migration: 20260731_04_add_qa_scopes_to_master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const fieldSet = new Set(cols.map(c => c.Field));

    if (!fieldSet.has('is_qa_all')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_qa_all TINYINT(1) DEFAULT 0');
    }
    if (!fieldSet.has('is_qa_bidang')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_qa_bidang TINYINT(1) DEFAULT 0');
    }
    if (!fieldSet.has('is_qa_personal')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_qa_personal TINYINT(1) DEFAULT 0');
    }

    await pool.query('UPDATE master_aplikasi_external SET is_qa_bidang = 1, is_qa_all = 1 WHERE is_quick_access = 1');

    console.log('✅ Migration 20260731_04_add_qa_scopes_to_master_aplikasi_external completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
