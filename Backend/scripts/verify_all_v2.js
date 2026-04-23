const pool = require('./src/config/db');

async function verifyAll() {
  try {
    const [rows435] = await pool.query('SELECT COUNT(*) as count FROM master_bogor_kelurahan_desa');
    console.log(`Total in master_bogor_kelurahan_desa: ${rows435[0].count}`);

    const [bogorK] = await pool.query("SELECT COUNT(*) as count FROM master_bogor_kelurahan_desa WHERE tipe = 'Kelurahan'");
    console.log(`Kelurahan count in Bogor table: ${bogorK[0].count}`);

    const [bogorD] = await pool.query("SELECT COUNT(*) as count FROM master_bogor_kelurahan_desa WHERE tipe = 'Desa'");
    console.log(`Desa count in Bogor table: ${bogorD[0].count}`);

    // Check config
    const [config] = await pool.query('SELECT kolom FROM master_data_config WHERE id = 36');
    console.log('Config columns:', config[0].kolom);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

verifyAll();
