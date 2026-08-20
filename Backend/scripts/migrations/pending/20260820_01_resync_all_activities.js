const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log('[Migration] Starting re-sync of all active kegiatan_manajemen to kegiatan_harian_pegawai...');
    
    // 1. Get all active kegiatan_manajemen IDs
    const [activities] = await pool.query('SELECT id FROM kegiatan_manajemen WHERE is_deleted = 0');
    console.log(`[Migration] Found ${activities.length} active activities to sync.`);

    // 2. Loop and sync each activity using the same logic as kegiatanManajemenController
    for (const act of activities) {
      const kegiatanId = act.id;
      
      // Get activity details
      const [kegData] = await pool.query(`
          SELECT k.*, DATE_FORMAT(k.tanggal, '%Y-%m-%d') as tanggal_str, t.kode as tipe_kode 
          FROM kegiatan_manajemen k
          LEFT JOIN master_tipe_kegiatan t ON k.jenis_kegiatan_id = t.id
          WHERE k.id = ?
      `, [kegiatanId]);
      
      if (kegData.length === 0) continue;
      const keg = kegData[0];
      const assignedPetugasIds = keg.petugas_ids ? String(keg.petugas_ids).split(',').map(Number).filter(Boolean) : [];

      // Get linked document IDs
      const [docRows] = await pool.query('SELECT dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [kegiatanId]);
      const lampiranIds = docRows.map(d => d.dokumen_id).join(',');

      // Delete existing logbook entries for this activity to avoid duplication
      await pool.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(kegiatanId)]);

      // Insert fresh entries for each officer and day
      const start = new Date(keg.tanggal);
      const end = new Date(keg.tanggal_akhir || keg.tanggal);

      for (const pId of assignedPetugasIds) {
          // Use a separate Date object for the loop to avoid mutating the original start date
          const current = new Date(start);
          while (current <= end) {
              const dateStr = current.toISOString().split('T')[0];
              const targetSessions = (keg.sesi === 'Full Day') ? ['Pagi', 'Siang'] : [keg.sesi || 'Pagi'];
              
              for (const s of targetSessions) {
                  await pool.query(`
                      INSERT INTO kegiatan_harian_pegawai (
                          profil_pegawai_id, tanggal, sesi, tipe_kegiatan, 
                          id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan,
                          created_by, updated_by
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                      pId, dateStr, s, keg.tipe_kode || 'RM',
                      String(kegiatanId), keg.nama_kegiatan, lampiranIds, keg.keterangan || '',
                      keg.created_by, keg.created_by
                  ]);
              }
              current.setDate(current.getDate() + 1);
          }
      }
    }

    console.log('[Migration] Re-sync of all active activities completed successfully.');
    console.log('✅ Migration 20260820_01_resync_all_activities completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] FAILED:', err);
    process.exit(1);
  }
}

run();
