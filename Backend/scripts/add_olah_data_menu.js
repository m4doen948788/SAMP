const pool = require('../src/config/db');

async function run() {
    try {
        console.log('--- STARTING OLAH DATA MENU SEEDING ---');

        const parentName = 'Perencanaan Pembangunan Terpadu';
        let [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = ? AND parent_id IS NULL", [parentName]);
        
        let parentId;
        if (parents.length === 0) {
            console.error(`❌ Parent menu '${parentName}' not found! Make sure migrations have run.`);
            process.exit(1);
        } else {
            parentId = parents[0].id;
            console.log(`ℹ️ Parent menu '${parentName}' found with ID: ${parentId}`);
        }

        const menuName = 'Olah Data';
        const actionPage = 'olah-data';
        const icon = 'FileSpreadsheet';
        const urutan = 10;

        // Check if menu already exists
        let [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [actionPage]);
        let menuId;

        if (existing.length === 0) {
            const [res] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, ?, ?, 1)",
                [menuName, actionPage, icon, parentId, urutan]
            );
            menuId = res.insertId;
            console.log(`✅ Created menu '${menuName}' with ID: ${menuId}`);
        } else {
            menuId = existing[0].id;
            await pool.query(
                "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, icon = ?, urutan = ?, is_active = 1 WHERE id = ?",
                [menuName, parentId, icon, urutan, menuId]
            );
            console.log(`ℹ️ Menu '${menuName}' already exists with ID: ${menuId}, updated metadata.`);
        }

        // Grant access permissions to all roles
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 8];
        }

        console.log(`Granting menu access to roles: ${roleIds.join(', ')}`);

        for (const rId of roleIds) {
            await pool.query(
                "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                [rId, menuId]
            );
        }

        console.log('✅ Successfully seeded Olah Data menu and granted role permissions.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding Olah Data menu:', err);
        process.exit(1);
    }
}

run();
