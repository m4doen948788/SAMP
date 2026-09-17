const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding is_quick_access column to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasQuickAccess = cols.some(c => c.Field === 'is_quick_access');

    if (!hasQuickAccess) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN is_quick_access TINYINT(1) DEFAULT 0 AFTER urutan');
      console.log('✅ Added column is_quick_access to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column is_quick_access already exists.');
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
