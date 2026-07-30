const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding tanggal_link column to master_aplikasi_external...');

    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasTanggalLink = cols.some(c => c.Field === 'tanggal_link');

    if (!hasTanggalLink) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tanggal_link DATE NULL AFTER keterangan');
      console.log('✅ Added column tanggal_link to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column tanggal_link already exists.');
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
