const pool = require('../src/config/db');

async function updateMenu() {
  try {
    console.log('Updating kelola_menu for Master Tipe Link under Manajemen (parent_id: 6)...');

    // 1. Find parent "Manajemen" (parent_id is NULL and UPPER(nama_menu) = 'MANAJEMEN')
    const [parents] = await pool.query('SELECT id FROM kelola_menu WHERE parent_id IS NULL AND UPPER(nama_menu) = "MANAJEMEN"');
    if (parents.length === 0) {
      console.error('❌ Parent menu MANAJEMEN not found.');
      process.exit(1);
    }
    const parentId = parents[0].id; // Should be 6

    // 2. Check existing menu item
    const [existing] = await pool.query(
      'SELECT id FROM kelola_menu WHERE action_page IN ("master-link", "master-tipe-link") OR nama_menu = "Master Tipe Link"'
    );

    let menuId;
    if (existing.length > 0) {
      menuId = existing[0].id;
      await pool.query(
        'UPDATE kelola_menu SET nama_menu = ?, tipe = ?, parent_id = ?, action_page = ?, icon = ?, is_active = 1 WHERE id = ?',
        ['Master Tipe Link', 'menu2', parentId, 'master-link', 'Link', menuId]
      );
      console.log(`✅ Updated existing menu (ID: ${menuId}) to parent_id: ${parentId} (Manajemen).`);
    } else {
      const [maxUrutan] = await pool.query('SELECT MAX(urutan) as max_u FROM kelola_menu WHERE parent_id = ?', [parentId]);
      const nextUrutan = (maxUrutan[0].max_u || 0) + 1;

      const [resInsert] = await pool.query(
        'INSERT INTO kelola_menu (nama_menu, tipe, parent_id, action_page, icon, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        ['Master Tipe Link', 'menu2', parentId, 'master-link', 'Link', nextUrutan]
      );
      menuId = resInsert.insertId;
      console.log(`✅ Created new menu (ID: ${menuId}) under parent_id: ${parentId} (Manajemen).`);
    }

    // 3. Grant access to all roles in master_tipe_user
    const [roles] = await pool.query('SELECT id FROM master_tipe_user');
    for (const r of roles) {
      await pool.query(
        'INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)',
        [r.id, menuId]
      );
    }
    console.log('✅ Granted access for Master Tipe Link menu to all user roles.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update menu:', err);
    process.exit(1);
  }
}

updateMenu();
