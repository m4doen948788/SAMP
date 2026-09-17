const pool = require('../src/config/db');

async function addMenu() {
    try {
        console.log('--- Adding RPJMD & Renstra 5 Tahunan Menu ---');
        
        // Search for parent RPJPD menu
        const [rpjpdMenu] = await pool.query("SELECT parent_id, urutan FROM kelola_menu WHERE action_page = 'rpjpd' OR nama_menu LIKE '%RPJPD%' LIMIT 1");
        const parentId = rpjpdMenu.length > 0 ? rpjpdMenu[0].parent_id : null;
        const targetUrutan = rpjpdMenu.length > 0 ? rpjpdMenu[0].urutan + 1 : 10;

        const [exists] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'rpjmd-renstra'");
        let menuId;

        if (exists.length === 0) {
            const [result] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ['RPJMD & Renstra 5 Tahunan', 'menu2', 'rpjmd-renstra', 'Calendar', parentId, targetUrutan, 1]
            );
            menuId = result.insertId;
            console.log('✅ Menu added successfully to kelola_menu with ID:', menuId);
        } else {
            menuId = exists[0].id;
            console.log('ℹ️ Menu rpjmd-renstra already exists with ID:', menuId);
        }

        // Grant access to roles in role_menu_access
        const [roles] = await pool.query("SELECT DISTINCT id FROM jenis_pegawai"); // or roles table
        const [existingRoles] = await pool.query("SELECT DISTINCT role_id FROM role_menu_access");
        
        for (let r of existingRoles) {
            const [accessExists] = await pool.query("SELECT id FROM role_menu_access WHERE role_id = ? AND menu_id = ?", [r.role_id, menuId]);
            if (accessExists.length === 0) {
                await pool.query("INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)", [r.role_id, menuId]);
            }
        }
        console.log('✅ Role access granted to all active roles.');

    } catch (err) {
        console.error('❌ Failed to add menu:', err.message);
    } finally {
        process.exit();
    }
}

addMenu();
