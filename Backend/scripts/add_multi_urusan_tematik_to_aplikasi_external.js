const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding urusan_ids and tematik_ids to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasUrusanIds = cols.some(c => c.Field === 'urusan_ids');
    const hasTematikIds = cols.some(c => c.Field === 'tematik_ids');

    if (!hasUrusanIds) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN urusan_ids TEXT NULL AFTER urusan_id');
      console.log('✅ Added column urusan_ids.');
    }

    if (!hasTematikIds) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tematik_ids TEXT NULL AFTER tagging');
      console.log('✅ Added column tematik_ids.');
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
