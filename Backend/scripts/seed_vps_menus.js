const pool = require('../src/config/db');

async function seedVpsMenus() {
    try {
        console.log('--- STARTING VPS MENU SYNC & SEEDING ---');

        // 1. Find or create the parent menu 'Kelola Aplikasi'
        const parentName = 'Kelola Aplikasi';
        let [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = ? AND tipe = 'menu1'", [parentName]);
        
        let parentId;
        if (parents.length === 0) {
            const [res] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, icon, urutan, is_active) VALUES (?, 'menu1', 'Settings', 11, 1)",
                [parentName]
            );
            parentId = res.insertId;
            console.log(`✅ Created parent menu '${parentName}' with ID: ${parentId}`);
        } else {
            parentId = parents[0].id;
            console.log(`ℹ️ Parent menu '${parentName}' already exists with ID: ${parentId}`);
        }

        // 2. Define submenus to insert/ensure
        const submenus = [
            {
                nama_menu: 'API Keys Gemini',
                action_page: 'kelola-aplikasi',
                icon: 'Brain',
                urutan: 9
            },
            {
                nama_menu: 'Prompt Widget',
                action_page: 'prompt-widget',
                icon: 'Settings',
                urutan: 10
            },
            {
                nama_menu: 'Kelola E-Signature',
                action_page: 'manajemen-esign',
                icon: 'PenTool',
                urutan: 110
            },
            {
                nama_menu: 'Audit Trail',
                action_page: 'audit-trail',
                icon: 'Activity',
                urutan: 100
            },
            {
                nama_menu: 'Monitor AI',
                action_page: 'monitor-ai',
                icon: 'Activity',
                urutan: 111
            }
        ];

        const insertedMenuIds = [parentId];

        for (const sub of submenus) {
            let [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [sub.action_page]);
            let menuId;
            if (existing.length === 0) {
                const [res] = await pool.query(
                    "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, ?, ?, 1)",
                    [sub.nama_menu, sub.action_page, sub.icon, parentId, sub.urutan]
                );
                menuId = res.insertId;
                console.log(`✅ Inserted submenu '${sub.nama_menu}' (page: ${sub.action_page}) with ID: ${menuId}`);
            } else {
                menuId = existing[0].id;
                // Update to ensure correct parent_id, urutan, and icon
                await pool.query(
                    "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, icon = ?, urutan = ? WHERE id = ?",
                    [sub.nama_menu, parentId, sub.icon, sub.urutan, menuId]
                );
                console.log(`ℹ️ Submenu '${sub.nama_menu}' already exists (ID: ${menuId}), updated metadata.`);
            }
            insertedMenuIds.push(menuId);
        }

        // 3. Grant access to all these menus for typical admin/user roles
        // We will grant to roles 1 (Super Admin), 2 (Admin Instansi), 3 (Pegawai), and any other active roles in master_tipe_user
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 8];
        }

        console.log(`Granting menu access to roles: ${roleIds.join(', ')}`);

        for (const rId of roleIds) {
            for (const mId of insertedMenuIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, mId]
                );
            }
        }
        console.log('✅ Successfully granted role permissions for all Kelola Aplikasi menus.');
        console.log('--- VPS MENU SYNC COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding VPS menus:', err);
        process.exit(1);
    }
}

seedVpsMenus();
