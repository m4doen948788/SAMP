const pool = require('../src/config/db');

async function run() {
    try {
        console.log('--- STARTING OLAH DATA SUBMENUS SEEDING ---');

        // 1. Get the parent menu "Olah Data"
        let [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'Olah Data' LIMIT 1");
        
        let parentId;
        if (parents.length === 0) {
            console.error("❌ Parent menu 'Olah Data' not found!");
            process.exit(1);
        } else {
            parentId = parents[0].id;
            console.log(`ℹ️ Parent menu 'Olah Data' found with ID: ${parentId}`);
        }

        // 2. Define the submenus
        const submenus = [
            { name: 'Rekap Geografis', action: 'olah-data-geografis', urutan: 1 },
            { name: 'Rekap Manual', action: 'olah-data-manual', urutan: 2 },
            { name: 'Komparasi RKPD / Renja', action: 'olah-data-komparasi', urutan: 3 },
            { name: 'Update & Merge Data', action: 'olah-data-update', urutan: 4 }
        ];

        // 3. Get all role IDs
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 8];
        }

        for (const sub of submenus) {
            // Check if submenu already exists
            let [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [sub.action]);
            let menuId;

            if (existing.length === 0) {
                const [res] = await pool.query(
                    "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, null, ?, ?, 1)",
                    [sub.name, sub.action, parentId, sub.urutan]
                );
                menuId = res.insertId;
                console.log(`... Created submenu '${sub.name}' with ID: ${menuId}`);
            } else {
                menuId = existing[0].id;
                await pool.query(
                    "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, urutan = ?, is_active = 1 WHERE id = ?",
                    [sub.name, parentId, sub.urutan, menuId]
                );
                console.log(`... Submenu '${sub.name}' already exists with ID: ${menuId}, updated metadata.`);
            }

            // Grant access permissions to all roles
            console.log(`   Granting access to roles: ${roleIds.join(', ')}`);
            for (const rId of roleIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, menuId]
                );
            }
        }

        console.log('✅ Successfully seeded all Olah Data submenus.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding Olah Data submenus:', err);
        process.exit(1);
    }
}

run();
