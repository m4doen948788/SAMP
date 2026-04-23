const mysql = require('mysql2/promise');
require('dotenv').config();

async function registerMenu() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("Registering Nayaxa Knowledge menu...");
        
        // 1. Get Parent ID for "Pengaturan"
        const [parents] = await conn.execute("SELECT id FROM kelola_menu WHERE nama_menu = 'Pengaturan' LIMIT 1");
        const parentId = parents[0] ? parents[0].id : null;

        // 2. Insert Menu
        const [insertRes] = await conn.execute(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ['Nayaxa Intelligence', 'menu2', 'nayaxa-knowledge', 'Brain', parentId, 99, 1]
        );
        const newMenuId = insertRes.insertId;
        console.log(`Menu 'Nayaxa Intelligence' registered with ID: ${newMenuId}`);

        // 3. Auto-grant to Superadmin (Role ID 1)
        await conn.execute(
            "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)",
            [1, newMenuId]
        );
        console.log("Access granted to Superadmin.");

    } catch (e) {
        console.error("Failed to register menu:", e.message);
    } finally {
        await conn.end();
        process.exit(0);
    }
}
registerMenu();
