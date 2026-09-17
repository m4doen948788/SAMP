const pool = require('../../../src/config/db');

async function run() {
  try {
    console.log('🔄 Running migration: 20260730_01_update_master_aplikasi_external...');

    // 1. Ensure columns exist on master_aplikasi_external
    const [cols] = await pool.query('DESCRIBE master_aplikasi_external');
    const fieldSet = new Set(cols.map(c => c.Field));

    if (fieldSet.has('asal_instansi') && !fieldSet.has('sumber')) {
      await pool.query('ALTER TABLE master_aplikasi_external CHANGE COLUMN asal_instansi sumber VARCHAR(255)');
      console.log('  - Renamed asal_instansi to sumber');
    } else if (!fieldSet.has('sumber')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN sumber VARCHAR(255) AFTER pembuat');
      console.log('  - Added column sumber');
    }

    if (!fieldSet.has('tipe_link_id')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tipe_link_id INT NULL AFTER sumber');
      console.log('  - Added column tipe_link_id');
    }

    if (!fieldSet.has('urusan_id')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN urusan_id INT NULL AFTER tipe_link_id');
      console.log('  - Added column urusan_id');
    }

    if (!fieldSet.has('tagging')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tagging VARCHAR(255) NULL AFTER urusan_id');
      console.log('  - Added column tagging');
    }

    if (!fieldSet.has('urusan_ids')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN urusan_ids TEXT NULL AFTER urusan_id');
      console.log('  - Added column urusan_ids');
    }

    if (!fieldSet.has('tematik_ids')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tematik_ids TEXT NULL AFTER tagging');
      console.log('  - Added column tematik_ids');
    }

    if (!fieldSet.has('keterangan')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN keterangan TEXT NULL AFTER tematik_ids');
      console.log('  - Added column keterangan');
    }

    if (!fieldSet.has('tanggal_link')) {
      await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tanggal_link DATE NULL AFTER keterangan');
      console.log('  - Added column tanggal_link');
    }

    // 2. Update kelola_menu to place Master Link Eksternal under MANAJEMEN (parent_id: 6)
    const [parents] = await pool.query('SELECT id FROM kelola_menu WHERE parent_id IS NULL AND UPPER(nama_menu) = "MANAJEMEN"');
    if (parents.length > 0) {
      const parentId = parents[0].id;
      const [maxUrutan] = await pool.query('SELECT MAX(urutan) as max_u FROM kelola_menu WHERE parent_id = ?', [parentId]);
      const nextUrutan = (maxUrutan[0].max_u || 0) + 1;

      await pool.query(
        'UPDATE kelola_menu SET parent_id = ?, nama_menu = "Master Link Eksternal", is_active = 1 WHERE action_page = "master-aplikasi-external"',
        [parentId]
      );
      console.log('  - Updated kelola_menu parent_id to 6 (MANAJEMEN) for Master Link Eksternal');

      // Grant access
      const [menuRows] = await pool.query('SELECT id FROM kelola_menu WHERE action_page = "master-aplikasi-external"');
      if (menuRows.length > 0) {
        const menuId = menuRows[0].id;
        const [roles] = await pool.query('SELECT id FROM master_tipe_user');
        for (const r of roles) {
          await pool.query(
            'INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)',
            [r.id, menuId]
          );
        }
        console.log('  - Granted role access for Master Link Eksternal menu');
      }
    }

    // Return Master Tipe Link to parent_id 42 if needed
    await pool.query(
      'UPDATE kelola_menu SET parent_id = 42, nama_menu = "Master Tipe Link", is_active = 1 WHERE action_page IN ("master-link", "master-tipe-link")'
    );

    console.log('✅ Migration 20260730_01_update_master_aplikasi_external completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
