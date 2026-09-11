const pool = require('../../../src/config/db');

async function run() {
    try {
        console.log('--- STARTING OLAH DATA UPDATE & VERIFIKASI MENU MIGRATION ---');

        // 1. Find parent menu 'Olah Data'
        let [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'Olah Data' OR action_page = 'olah-data' LIMIT 1");
        
        let parentId;
        if (parents.length === 0) {
            // Find Planning parent
            let [pptParents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'Perencanaan Pembangunan Terpadu' AND parent_id IS NULL LIMIT 1");
            let pptParentId = pptParents.length > 0 ? pptParents[0].id : null;

            const [res] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES ('Olah Data', 'menu2', 'olah-data', 'FileSpreadsheet', ?, 10, 1)",
                [pptParentId]
            );
            parentId = res.insertId;
            console.log(`✅ Created parent menu 'Olah Data' with ID: ${parentId}`);
        } else {
            parentId = parents[0].id;
            console.log(`ℹ️ Parent menu 'Olah Data' found with ID: ${parentId}`);
        }

        // 2. Define submenus to ensure
        const submenus = [
            { name: 'Update & Merge Data', action: 'olah-data-update', urutan: 4 },
            { name: 'Verifikasi Dokumen', action: 'olah-data-verifikasi', urutan: 5 }
        ];

        // 3. Get all role IDs
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            let [distinctRoles] = await pool.query("SELECT DISTINCT role_id FROM role_menu_access");
            roleIds = distinctRoles.map(r => r.role_id);
        }
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 8];
        }

        // Grant access to parent menu first
        for (const rId of roleIds) {
            await pool.query(
                "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                [rId, parentId]
            );
        }

        // 4. Seed and grant submenus
        for (const sub of submenus) {
            let [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [sub.action]);
            let menuId;

            if (existing.length === 0) {
                const [res] = await pool.query(
                    "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, null, ?, ?, 1)",
                    [sub.name, sub.action, parentId, sub.urutan]
                );
                menuId = res.insertId;
                console.log(`✅ Created submenu '${sub.name}' (action: ${sub.action}) with ID: ${menuId}`);
            } else {
                menuId = existing[0].id;
                await pool.query(
                    "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, urutan = ?, is_active = 1 WHERE id = ?",
                    [sub.name, parentId, sub.urutan, menuId]
                );
                console.log(`ℹ️ Submenu '${sub.name}' already exists (ID: ${menuId}), updated metadata.`);
            }

            // Grant permission to all roles
            for (const rId of roleIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, menuId]
                );
            }
        }

        console.log('✅ Successfully granted role permissions for Update & Merge Data and Verifikasi Dokumen.');
        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

run();
