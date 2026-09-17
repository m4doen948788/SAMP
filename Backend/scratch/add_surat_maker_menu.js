const pool = require('../src/config/db');

async function addMenu() {
    try {
        // 1. Check if menu already exists
        let [rows] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'surat-maker'");
        let menuId;
        
        if (rows.length > 0) {
            menuId = rows[0].id;
            console.log(`Menu already exists with ID: ${menuId}`);
        } else {
            const [res] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ['Surat Maker', 'menu2', 'surat-maker', 'FileText', 6, 9, 1]
            );
            menuId = res.insertId;
            console.log(`Menu added with ID: ${menuId}`);
        }

        // 2. Grant Access (Assuming roles 1=Superadmin, 2=Admin Instansi, 8=Admin Bapperida)
        const roles = [1, 2, 8];
        for (const roleId of roles) {
            // Check if access already exists to avoid duplicates
            const [accessExist] = await pool.query("SELECT id FROM role_menu_access WHERE role_id = ? AND menu_id = ?", [roleId, menuId]);
            if (accessExist.length === 0) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)",
                    [roleId, menuId]
                );
                console.log(`Access granted for role ID: ${roleId}`);
            } else {
                console.log(`Access already exists for role ID: ${roleId}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error adding menu:', err);
        process.exit(1);
    }
}

addMenu();
