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
                nama_menu: 'Kelola Menu',
                action_page: 'kelola-menu',
                icon: 'Settings',
                urutan: 1
            },
            {
                nama_menu: 'Manajemen User',
                action_page: 'manajemen-user',
                icon: 'Users',
                urutan: 2
            },
            {
                nama_menu: 'Manajemen Hak Akses',
                action_page: 'manajemen-hak-akses',
                icon: 'ShieldCheck',
                urutan: 3
            },
            {
                nama_menu: 'Pengaturan Tema',
                action_page: 'pengaturan-tema',
                icon: 'Palette',
                urutan: 4
            },
            {
                nama_menu: 'API Keys Gemini',
                action_page: 'kelola-aplikasi',
                icon: 'Brain',
                urutan: 5
            },
            {
                nama_menu: 'Prompt Widget',
                action_page: 'prompt-widget',
                icon: 'Settings',
                urutan: 6
            },
            {
                nama_menu: 'Audit Trail',
                action_page: 'audit-trail',
                icon: 'Activity',
                urutan: 7
            },
            {
                nama_menu: 'Kelola E-Signature',
                action_page: 'manajemen-esign',
                icon: 'PenTool',
                urutan: 8
            },
            {
                nama_menu: 'Monitor AI',
                action_page: 'monitor-ai',
                icon: 'Cpu',
                urutan: 9
            },
            {
                nama_menu: 'Generator Halaman',
                action_page: 'generator-halaman',
                icon: 'Layout',
                urutan: 10
            },
            {
                nama_menu: 'Pelabelan Tabel',
                action_page: 'pelabelan-tabel',
                icon: 'Tag',
                urutan: 11
            },
            {
                nama_menu: 'Buat Master Data',
                action_page: 'buat-master-data',
                icon: 'Database',
                urutan: 12
            },
            {
                nama_menu: 'Nayaxa Intelligence',
                action_page: 'nayaxa-knowledge',
                icon: 'Sparkles',
                urutan: 13
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

        // ── 4. Seed 'Olah Data' Parent Menu & Submenus ──
        console.log('--- STARTING OLAH DATA MENU & SUBMENUS SEEDING ---');
        const pptParentName = 'Perencanaan Pembangunan Terpadu';
        let [pptParents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = ? AND parent_id IS NULL", [pptParentName]);
        
        let pptParentId;
        if (pptParents.length > 0) {
            pptParentId = pptParents[0].id;
            console.log(`ℹ️ Parent menu '${pptParentName}' found with ID: ${pptParentId}`);
            
            const olahDataMenuName = 'Olah Data';
            const olahDataActionPage = 'olah-data';
            const olahDataIcon = 'FileSpreadsheet';
            const olahDataUrutan = 10;

            let [existingOlahData] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [olahDataActionPage]);
            let olahDataMenuId;

            if (existingOlahData.length === 0) {
                const [res] = await pool.query(
                    "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, ?, ?, 1)",
                    [olahDataMenuName, olahDataActionPage, olahDataIcon, pptParentId, olahDataUrutan]
                );
                olahDataMenuId = res.insertId;
                console.log(`✅ Created menu '${olahDataMenuName}' with ID: ${olahDataMenuId}`);
            } else {
                olahDataMenuId = existingOlahData[0].id;
                await pool.query(
                    "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, icon = ?, urutan = ?, is_active = 1 WHERE id = ?",
                    [olahDataMenuName, pptParentId, olahDataIcon, olahDataUrutan, olahDataMenuId]
                );
                console.log(`ℹ️ Menu '${olahDataMenuName}' already exists with ID: ${olahDataMenuId}, updated metadata.`);
            }

            // Grant permission to Olah Data parent
            for (const rId of roleIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, olahDataMenuId]
                );
            }

            // Now seed submenus under Olah Data
            const olahDataSubmenus = [
                { name: 'Rekap Geografis', action: 'olah-data-geografis', urutan: 1 },
                { name: 'Rekap Manual', action: 'olah-data-manual', urutan: 2 },
                { name: 'Komparasi RKPD / Renja', action: 'olah-data-komparasi', urutan: 3 }
            ];

            for (const sub of olahDataSubmenus) {
                let [existingSub] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [sub.action]);
                let subMenuId;

                if (existingSub.length === 0) {
                    const [res] = await pool.query(
                        "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, null, ?, ?, 1)",
                        [sub.name, sub.action, olahDataMenuId, sub.urutan]
                    );
                    subMenuId = res.insertId;
                    console.log(`... Created submenu '${sub.name}' with ID: ${subMenuId}`);
                } else {
                    subMenuId = existingSub[0].id;
                    await pool.query(
                        "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, urutan = ?, is_active = 1 WHERE id = ?",
                        [sub.name, olahDataMenuId, sub.urutan, subMenuId]
                    );
                    console.log(`... Submenu '${sub.name}' already exists with ID: ${subMenuId}, updated metadata.`);
                }

                // Grant permission to submenus
                for (const rId of roleIds) {
                    await pool.query(
                        "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                        "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                        [rId, subMenuId]
                    );
                }
            }
            console.log('✅ Successfully seeded all Olah Data menus & submenus.');
        } else {
            console.warn(`⚠️ Parent menu '${pptParentName}' not found. Skipping Olah Data submenus seeding.`);
        }

        console.log('--- VPS MENU SYNC COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding VPS menus:', err);
        process.exit(1);
    }
}

seedVpsMenus();
