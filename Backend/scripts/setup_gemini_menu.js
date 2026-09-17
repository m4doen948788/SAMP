const pool = require('./src/config/db');

async function setupMenu() {
    try {
        // 1. Insert Menu under "Kelola Aplikasi" (parent_id: 40)
        const [result] = await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) " +
            "VALUES ('API Key Gemini', 'menu2', 'kelola-aplikasi', 'Brain', 40, 8, 1)"
        );
        const newMenuId = result.insertId;
        console.log(`Menu added with ID: ${newMenuId}`);

        // 2. Give Superadmin (role_id: 1) access to this new menu
        await pool.query(
            "INSERT INTO role_menu_access (role_id, menu_id) VALUES (1, ?) " +
            "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
            [newMenuId]
        );
        console.log(`Access granted to Superadmin for menu ID: ${newMenuId}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

setupMenu();
