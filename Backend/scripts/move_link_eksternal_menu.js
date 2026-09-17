const pool = require('../src/config/db');

async function updateMenu() {
  try {
    console.log('Moving Master Link Eksternal under MANAJEMEN (parent_id: 6)...');

    // 1. Move Master Link Eksternal (action_page: 'master-aplikasi-external') to parent_id = 6 (MANAJEMEN)
    const [maxUrutan] = await pool.query('SELECT MAX(urutan) as max_u FROM kelola_menu WHERE parent_id = 6');
    const nextUrutan = (maxUrutan[0].max_u || 0) + 1;

    const [resApp] = await pool.query(
      'UPDATE kelola_menu SET parent_id = 6, nama_menu = "Master Link Eksternal", urutan = ?, is_active = 1 WHERE action_page = "master-aplikasi-external"',
      [nextUrutan]
    );

    console.log('✅ Moved Master Link Eksternal (master-aplikasi-external) to parent_id: 6 (MANAJEMEN).');

    // 2. Return Master Tipe Link (master-link) back to parent_id = 42 (Master Data)
    await pool.query(
      'UPDATE kelola_menu SET parent_id = 42, nama_menu = "Master Tipe Link", is_active = 1 WHERE action_page IN ("master-link", "master-tipe-link")'
    );
    console.log('✅ Returned Master Tipe Link (master-link) back to parent_id: 42 (Master Data).');

    // 3. Ensure role access is granted for master-aplikasi-external (menu ID 45)
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
      console.log(`✅ Granted role access for menu ID ${menuId} to all roles.`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update menu:', err);
    process.exit(1);
  }
}

updateMenu();
