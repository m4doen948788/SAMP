const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding keterangan column to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasKeterangan = cols.some(c => c.Field === 'keterangan');

    if (!hasKeterangan) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN keterangan TEXT NULL AFTER tematik_ids');
      console.log('✅ Added column keterangan to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column keterangan already exists.');
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
