const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Adding Quick Access menu item to kelola_menu...');

    const [existing] = await pool.query('SELECT * FROM kelola_menu WHERE action_page = ? OR nama_menu = ?', ['quick-access', 'Quick Access']);
    
    let menuId;
    if (existing.length === 0) {
      // Find parent_id and urutan of Master Link Eksternal (action_page: master-aplikasi-external)
      const [parentMenu] = await pool.query('SELECT id, parent_id, urutan FROM kelola_menu WHERE action_page = ?', ['master-aplikasi-external']);
      
      const parentId = parentMenu.length > 0 ? parentMenu[0].parent_id : 6;
      const baseUrutan = parentMenu.length > 0 ? parentMenu[0].urutan + 1 : 18;

      const [res] = await pool.query(
        'INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Quick Access', 'menu2', 'quick-access', 'Zap', parentId, baseUrutan, 1]
      );
      menuId = res.insertId;
      console.log(`✅ Created Quick Access menu with ID ${menuId}`);

      // Add access for roles 1 to 11
      for (let roleId = 1; roleId <= 11; roleId++) {
        await pool.query('INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)', [roleId, menuId]);
      }
      console.log('✅ Granted Quick Access menu permissions for roles 1-11.');
    } else {
      menuId = existing[0].id;
      console.log(`ℹ️ Quick Access menu already exists with ID ${menuId}`);
    }

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
