const pool = require('./db');

async function fixBogorVillages() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const villages = [
      { id: '3201140009', kecamatan_id: '3201140', nama: 'SENTUL' },
      { id: '3201250011', kecamatan_id: '3201250', nama: 'CURUG' },
      { id: '3201050020', kecamatan_id: '3201050', nama: 'BENTENG' },
      { id: '3201040016', kecamatan_id: '3201040', nama: 'DUKUH' },
      { id: '3201030016', kecamatan_id: '3201030', nama: 'GUNUNG BUNDER 1' },
      { id: '3201030017', kecamatan_id: '3201030', nama: 'GUNUNG BUNDER 2' },
      { id: '3201271012', kecamatan_id: '3201271', nama: 'URUG' },
      { id: '3201280019', kecamatan_id: '3201280', nama: 'CURUG' },
      { id: '3201280020', kecamatan_id: '3201280', nama: 'SETU' },
      { id: '3201181010', kecamatan_id: '3201181', nama: 'SODONG' }
    ];

    console.log('Inserting 10 missing villages in Kabupaten Bogor...');

    for (const v of villages) {
      // Check if already exists by name in that kecamatan
      const [existing] = await connection.query(
        'SELECT id FROM master_kelurahan WHERE kecamatan_id = ? AND nama = ?',
        [v.kecamatan_id, v.nama]
      );

      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO master_kelurahan (id, kecamatan_id, nama) VALUES (?, ?, ?)',
          [v.id, v.kecamatan_id, v.nama]
        );
        console.log(`Inserted: ${v.nama} (${v.id})`);
      } else {
        console.log(`Skipped (already exists): ${v.nama} (${existing[0].id})`);
      }
    }

    await connection.commit();
    console.log('Migration completed successfully.');

  } catch (err) {
    await connection.rollback();
    console.error('Migration failed:', err);
  } finally {
    connection.release();
    process.exit();
  }
}

fixBogorVillages();
