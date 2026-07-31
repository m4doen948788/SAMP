const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding urutan column to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasUrutan = cols.some(c => c.Field === 'urutan');

    if (!hasUrutan) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN urutan INT DEFAULT 0');
      console.log('✅ Added column urutan to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column urutan already exists.');
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
