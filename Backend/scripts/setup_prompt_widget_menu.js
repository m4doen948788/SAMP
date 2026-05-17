const pool = require('../src/config/db');

async function setupMenu() {
    try {
        console.log('Starting menu setup for Prompt Widget...');

        // 1. Update existing API Key Gemini menu name
        await pool.query(
            "UPDATE kelola_menu SET nama_menu = 'API Keys Gemini' WHERE action_page = 'kelola-aplikasi'"
        );
        console.log('Updated existing menu name to API Keys Gemini');

        // 2. Check if Prompt Widget menu already exists
        const [existing] = await pool.query(
            "SELECT id FROM kelola_menu WHERE action_page = 'prompt-widget'"
        );

        let menuId;
        if (existing.length > 0) {
            menuId = existing[0].id;
            console.log(`Prompt Widget menu already exists with ID: ${menuId}`);
        } else {
            const [result] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) " +
                "VALUES ('Prompt Widget', 'menu2', 'prompt-widget', 'Settings', 40, 10, 1)"
            );
            menuId = result.insertId;
            console.log(`Inserted Prompt Widget menu with ID: ${menuId}`);
        }

        // 3. Grant access to Parent Menu (40), API Keys Gemini (97), and Prompt Widget (menuId)
        // For all main user/admin roles (1, 2, 3, 4, 5, 6, 8)
        const roles = [1, 2, 3, 4, 5, 6, 8];
        const menuIds = [40, 97, menuId];

        for (const rId of roles) {
            for (const mId of menuIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, mId]
                );
            }
        }
        console.log('Successfully granted access to all main roles for Kelola Aplikasi, API Keys Gemini, and Prompt Widget.');

        process.exit(0);
    } catch (err) {
        console.error('Error during menu setup:', err);
        process.exit(1);
    }
}

setupMenu();
