const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding urusan_id and tagging columns to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasUrusanId = cols.some(c => c.Field === 'urusan_id');
    const hasTagging = cols.some(c => c.Field === 'tagging');

    if (!hasUrusanId) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN urusan_id INT NULL AFTER tipe_link_id');
      console.log('✅ Added column urusan_id to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column urusan_id already exists.');
    }

    if (!hasTagging) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tagging VARCHAR(255) NULL AFTER urusan_id');
      console.log('✅ Added column tagging to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column tagging already exists.');
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
