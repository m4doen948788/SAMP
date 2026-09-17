const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Running Link Eksternal & Tipe Link migration...');

    // 1. Create master_tipe_link table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_tipe_link (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )
    `);
    console.log('✅ Table master_tipe_link verified/created.');

    // Seed default tipe link if empty
    const [existingTypes] = await pool.query('SELECT COUNT(*) as count FROM master_tipe_link WHERE deleted_at IS NULL');
    if (existingTypes[0].count === 0) {
      const defaultTypes = ['Sistem Informasi', 'Aplikasi Daerah', 'Dokumen / Drive', 'Website Resmi', 'Lainnya'];
      for (const t of defaultTypes) {
        await pool.query('INSERT INTO master_tipe_link (nama) VALUES (?)', [t]);
      }
      console.log('✅ Default Tipe Link seeded:', defaultTypes);
    }

    // 2. Alter master_aplikasi_external table
    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const hasAsalInstansi = cols.some(c => c.Field === 'asal_instansi');
    const hasSumber = cols.some(c => c.Field === 'sumber');
    const hasTipeLinkId = cols.some(c => c.Field === 'tipe_link_id');

    if (hasAsalInstansi && !hasSumber) {
      await pool.query('ALTER TABLE master_aplikasi_external CHANGE COLUMN asal_instansi sumber VARCHAR(255)');
      console.log('✅ Renamed column asal_instansi to sumber in master_aplikasi_external.');
    } else if (!hasSumber) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN sumber VARCHAR(255) AFTER pembuat');
      console.log('✅ Added column sumber to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column sumber already exists.');
    }

    if (!hasTipeLinkId) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tipe_link_id INT NULL AFTER sumber');
      console.log('✅ Added column tipe_link_id to master_aplikasi_external.');
    } else {
      console.log('ℹ️ Column tipe_link_id already exists.');
    }

    // 3. Register to generated_pages & master_data_config if needed
    await pool.query(
      'INSERT IGNORE INTO generated_pages (title, slug, table_name, icon) VALUES (?, ?, ?, ?)',
      ['Master Tipe Link', 'master-tipe-link', 'master_tipe_link', 'Layout']
    );

    console.log('🎉 Migration finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
