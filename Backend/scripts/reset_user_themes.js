const pool = require('./config/db');

async function resetUserThemes() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Memulai proses reset tema pengguna ke default...');

    // 1. Reset tema dan tema_custom_colors di tabel profil_pegawai
    const [resultProfil] = await connection.query(`
      UPDATE profil_pegawai 
      SET tema = 'default', tema_custom_colors = NULL
      WHERE tema != 'default' OR tema IS NULL OR tema_custom_colors IS NOT NULL
    `);
    console.log(`✅ Berhasil mereset profil pegawai: ${resultProfil.affectedRows} baris diperbarui ke tema default.`);

    // 2. Pastikan pengaturan aplikasi tema global juga kembali ke default
    await connection.query(`
      INSERT INTO pengaturan_aplikasi (pengaturan_key, pengaturan_value) 
      VALUES ('admin_theme', 'default') 
      ON DUPLICATE KEY UPDATE pengaturan_value = 'default'
    `);

    await connection.query(`
      INSERT INTO pengaturan_aplikasi (pengaturan_key, pengaturan_value) 
      VALUES ('admin_custom_colors', NULL) 
      ON DUPLICATE KEY UPDATE pengaturan_value = NULL
    `);

    console.log('✅ Pengaturan tema global (admin_theme) berhasil direset ke "default".');
    console.log('🎉 Seluruh pengguna kini kembali menggunakan tema default Bapperida.');
  } catch (err) {
    console.error('❌ Gagal mereset tema pengguna:', err.message);
  } finally {
    connection.release();
    process.exit();
  }
}

resetUserThemes();
