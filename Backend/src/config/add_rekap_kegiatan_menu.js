const pool = require('./db');

async function addRekapMenu() {
    try {
        const [existing] = await pool.query(
            "SELECT id FROM kelola_menu WHERE (nama_menu = 'Rekap Kegiatan' OR action_page = 'rekap-kegiatan') AND parent_id = 109"
        );
        let menuId;
        if (existing.length > 0) {
            console.log('Menu already exists with id:', existing[0].id);
            menuId = existing[0].id;
        } else {
            const [result] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ['Rekap Kegiatan', 'menu3', 'rekap-kegiatan', 'CalendarRange', 109, 3, 1]
            );
            menuId = result.insertId;
            console.log('Created Rekap Kegiatan menu with id:', menuId);
        }

        // Grant access to roles that have access to parent 109 or sibling 108/29
        const [roles] = await pool.query(
            "SELECT DISTINCT role_id FROM role_menu_access WHERE menu_id IN (108, 29, 109)"
        );
        for (const r of roles) {
            await pool.query(
                "INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)",
                [r.role_id, menuId]
            );
        }
        console.log('Granted access to roles:', roles.map(r => r.role_id));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addRekapMenu();
