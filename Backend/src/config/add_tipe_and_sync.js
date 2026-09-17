const pool = require('./db');

async function updateKelurahanMaster() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('--- Step 1: Synchronizing master_bogor_kelurahan_desa ---');
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

    for (const v of villages) {
      await connection.query(
        'INSERT IGNORE INTO master_bogor_kelurahan_desa (id, kecamatan_id, nama) VALUES (?, ?, ?)',
        [v.id, v.kecamatan_id, v.nama]
      );
    }
    console.log('Added missing villages to master_bogor_kelurahan_desa.');

    console.log('\n--- Step 2: Adding "tipe" column ---');
    // Check if column exists first
    const [colsK] = await connection.query("SHOW COLUMNS FROM master_kelurahan LIKE 'tipe'");
    if (colsK.length === 0) {
      await connection.query("ALTER TABLE master_kelurahan ADD COLUMN tipe VARCHAR(50) DEFAULT 'Desa'");
      console.log('Added "tipe" column to master_kelurahan.');
    }

    const [colsB] = await connection.query("SHOW COLUMNS FROM master_bogor_kelurahan_desa LIKE 'tipe'");
    if (colsB.length === 0) {
      await connection.query("ALTER TABLE master_bogor_kelurahan_desa ADD COLUMN tipe VARCHAR(50) DEFAULT 'Desa'");
      console.log('Added "tipe" column to master_bogor_kelurahan_desa.');
    }

    console.log('\n--- Step 3: Populating "tipe" column for Bogor ---');
    // 19 Kelurahan in Bogor
    const bogorKelurahanNames = [
        // Cibinong (13)
        'CIBINONG', 'CIRIMEKAR', 'CIRIUNG', 'HARAPAN JAYA', 'KARADENAN', 'NANGGEWER', 
        'NANGGEWER MEKAR', 'PABUARAN', 'PABUARAN MEKAR', 'PAKANSARI', 'PONDOK RAJEG', 
        'SUKAHATI', 'TENGAH',
        // Others
        'KARANG ASEM BARAT', 'PUSPANEGARA', // Citeureup
        'PABUARAN', // Bojonggede (Wait, Pabuaran is also in Cibinong, need to be careful with kecamatan_id)
        'PADASUKA', // Ciomas
        'CISARUA',  // Cisarua
        'ATANG SENJAYA' // Kemang
    ];

    // More precise update for Bogor Kelurahan
    const kelurahanMap = [
      { nama: 'CIBINONG', kec: '3201010' },
      { nama: 'CIRIMEKAR', kec: '3201010' },
      { nama: 'CIRIUNG', kec: '3201010' },
      { nama: 'HARAPAN JAYA', kec: '3201010' },
      { nama: 'KARADENAN', kec: '3201010' },
      { nama: 'NANGGEWER', kec: '3201010' },
      { nama: 'NANGGEWER MEKAR', kec: '3201010' },
      { nama: 'PABUARAN', kec: '3201010' },
      { nama: 'PABUARAN MEKAR', kec: '3201010' },
      { nama: 'PAKANSARI', kec: '3201010' },
      { nama: 'PONDOK RAJEG', kec: '3201010' },
      { nama: 'SUKAHATI', kec: '3201010' },
      { nama: 'TENGAH', kec: '3201010' },
      { nama: 'KARANG ASEM BARAT', kec: '3201020' },
      { nama: 'PUSPANEGARA', kec: '3201020' },
      { nama: 'PABUARAN', kec: '3201130' }, // Bojonggede
      { nama: 'PADASUKA', kec: '3201190' }, // Ciomas
      { nama: 'CISARUA', kec: '3201210' },  // Cisarua
      { nama: 'ATANG SENJAYA', kec: '3201240' } // Kemang
    ];

    for (const k of kelurahanMap) {
      await connection.query(
        "UPDATE master_kelurahan SET tipe = 'Kelurahan' WHERE nama = ? AND kecamatan_id = ?",
        [k.nama, k.kec]
      );
      await connection.query(
        "UPDATE master_bogor_kelurahan_desa SET tipe = 'Kelurahan' WHERE nama = ? AND kecamatan_id = ?",
        [k.nama, k.kec]
      );
    }
    console.log('Populated "tipe" column for Kabupaten Bogor (19 Kelurahan).');

    console.log('\n--- Step 4: Heuristic for other regions ---');
    await connection.query(
      "UPDATE master_kelurahan SET tipe = 'Kelurahan' WHERE (nama LIKE 'Kelurahan %' OR nama LIKE 'KELURAHAN %') AND tipe != 'Kelurahan'"
    );
    console.log('Populated "tipe" column for other regions based on name heuristic.');

    console.log('\n--- Step 5: Updating master_data_config ---');
    // ID 23: master_kelurahan
    const [config23] = await connection.query('SELECT kolom FROM master_data_config WHERE id = 23');
    if (config23.length > 0) {
      let kolom = JSON.parse(config23[0].kolom);
      if (!kolom.find(k => k.nama_db === 'tipe')) {
        kolom.push({ nama: 'Tipe', nama_db: 'tipe', tipe: 'string', wajib: true });
        await connection.query('UPDATE master_data_config SET kolom = ? WHERE id = 23', [JSON.stringify(kolom)]);
        console.log('Updated master_data_config for master_kelurahan.');
      }
    }

    // ID 36: master_bogor_kelurahan_desa
    const [config36] = await connection.query('SELECT kolom FROM master_data_config WHERE id = 36');
    if (config36.length > 0) {
      let kolom = JSON.parse(config36[0].kolom);
      if (!kolom.find(k => k.nama_db === 'tipe')) {
        kolom.push({ nama: 'Tipe', nama_db: 'tipe', tipe: 'string', wajib: true });
        await connection.query('UPDATE master_data_config SET kolom = ? WHERE id = 36', [JSON.stringify(kolom)]);
        console.log('Updated master_data_config for master_bogor_kelurahan_desa.');
      }
    }

    await connection.commit();
    console.log('\nMigration and configuration update completed successfully.');

  } catch (err) {
    await connection.rollback();
    console.error('Update failed:', err);
  } finally {
    connection.release();
    process.exit();
  }
}

updateKelurahanMaster();
