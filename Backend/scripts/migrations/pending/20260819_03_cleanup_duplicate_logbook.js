const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log('[Migration] Starting cleanup of duplicate logbook entries in kegiatan_harian_pegawai...');
    const [result] = await pool.query(`
      DELETE k1 FROM kegiatan_harian_pegawai k1
      INNER JOIN kegiatan_harian_pegawai k2 
      ON k1.profil_pegawai_id = k2.profil_pegawai_id 
      AND k1.tanggal = k2.tanggal 
      AND k1.sesi = k2.sesi 
      AND k1.tipe_kegiatan = k2.tipe_kegiatan
      WHERE k1.id > k2.id
    `);
    console.log(`[Migration] Done! Removed ${result.affectedRows} duplicate entries.`);
    console.log('✅ Migration 20260819_03_cleanup_duplicate_logbook completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] FAILED:', err.message);
    process.exit(1);
  }
}

run();
