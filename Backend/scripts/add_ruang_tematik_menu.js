const pool = require('../src/config/db');

async function addMenu() {
    console.log('[Menu] Registering Ruang Tematik menu...');
    try {
        // Check if menu already exists
        const [existing] = await pool.query('SELECT id FROM kelola_menu WHERE action_page = ?', ['ruang-tematik']);
        
        let menuId;
        if (existing.length > 0) {
            menuId = existing[0].id;
            console.log(`[Menu] Menu already exists with ID ${menuId}.`);
        } else {
            // Find max urutan in parent 15 (Perencanaan)
            const [maxUrutan] = await pool.query('SELECT MAX(urutan) as max_u FROM kelola_menu WHERE parent_id = 15');
            const nextUrutan = (maxUrutan[0]?.max_u || 0) + 1;

            const [res] = await pool.query(`
                INSERT INTO kelola_menu (
                    nama_menu, tipe, action_page, icon, parent_id, urutan, is_active, created_at, updated_at
                ) VALUES (
                    'Ruang Tematik', 'internal', 'ruang-tematik', 'Layers', 15, ?, 1, NOW(), NOW()
                )
            `, [nextUrutan]);
            menuId = res.insertId;
            console.log(`[Menu] Inserted Ruang Tematik menu with ID ${menuId}, urutan ${nextUrutan}.`);
        }

        // Grant access to all user roles (master_tipe_user)
        const [roles] = await pool.query('SELECT id FROM master_tipe_user');
        console.log(`[Menu] Granting access to ${roles.length} roles...`);

        for (const role of roles) {
            const [hasAccess] = await pool.query(
                'SELECT id FROM role_menu_access WHERE role_id = ? AND menu_id = ?',
                [role.id, menuId]
            );
            if (hasAccess.length === 0) {
                await pool.query(
                    'INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)',
                    [role.id, menuId]
                );
            }
        }

        console.log('[Menu] Successfully configured Ruang Tematik menu and permissions.');
        process.exit(0);
    } catch (err) {
        console.error('[Menu Error]:', err);
        process.exit(1);
    }
}

addMenu();
