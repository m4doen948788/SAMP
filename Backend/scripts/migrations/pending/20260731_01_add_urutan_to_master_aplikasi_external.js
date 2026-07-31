const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log('🔄 Running migration: 20260731_01_add_urutan_to_master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const fieldSet = new Set(cols.map(c => c.Field));

    if (!fieldSet.has('urutan')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN urutan INT DEFAULT 0');
      console.log('  - Added column urutan to master_aplikasi_external');
    }

    console.log('✅ Migration 20260731_01_add_urutan_to_master_aplikasi_external completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
