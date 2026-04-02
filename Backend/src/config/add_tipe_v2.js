const pool = require('./db');

async function updateKelurahanMasterV2() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('--- Correcting "tipe" column population for Bogor ---');
    
    // First, set everyone to 'Desa' to be safe
    await connection.query("UPDATE master_kelurahan SET tipe = 'Desa' WHERE kecamatan_id LIKE '3201%'");
    await connection.query("UPDATE master_bogor_kelurahan_desa SET tipe = 'Desa'");

    // Update rules for Kelurahan in Bogor (ID 3201)
    
    // 1. All in Kecamatan CIBINONG (3201210)
    await connection.query(
      "UPDATE master_kelurahan SET tipe = 'Kelurahan' WHERE kecamatan_id = '3201210'"
    );
    await connection.query(
      "UPDATE master_bogor_kelurahan_desa SET tipe = 'Kelurahan' WHERE kecamatan_id = '3201210'"
    );

    // 2. Others specifically by name and kecamatan_id
    const specificKelurahan = [
      { name: 'KARANG ASEM BARAT', kec: '3201200' }, // Citeureup
      { name: 'PUSPANEGARA', kec: '3201200' },       // Citeureup
      { name: 'PABUARAN', kec: '3201220' },          // Bojong Gede
      { name: 'ATANG SENJAYA', kec: '3201230' },     // Kemang
      { name: 'PADASUKA', kec: '3201070' },          // Ciomas
      { name: 'CISARUA', kec: '3201110' }            // Cisarua
    ];

    for (const k of specificKelurahan) {
      await connection.query(
        "UPDATE master_kelurahan SET tipe = 'Kelurahan' WHERE nama = ? AND kecamatan_id = ?",
        [k.name, k.kec]
      );
      await connection.query(
        "UPDATE master_bogor_kelurahan_desa SET tipe = 'Kelurahan' WHERE nama = ? AND kecamatan_id = ?",
        [k.name, k.kec]
      );
    }

    await connection.commit();
    console.log('Successfully updated 19 Kelurahan in Bogor.');

  } catch (err) {
    await connection.rollback();
    console.error('Update failed:', err);
  } finally {
    connection.release();
    process.exit();
  }
}

updateKelurahanMasterV2();
