const pool = require('./src/config/db');

async function registerMenu() {
    try {
        console.log("Registering Nayaxa Knowledge menu via Pool...");
        
        // 1. Get Parent ID for "Pengaturan"
        const [parents] = await pool.execute("SELECT id FROM kelola_menu WHERE nama_menu = 'Pengaturan' LIMIT 1");
        const parentId = parents[0] ? parents[0].id : null;

        // 2. Check if already exists
        const [existing] = await pool.execute("SELECT id FROM kelola_menu WHERE action_page = 'nayaxa-knowledge' LIMIT 1");
        
        if (existing.length > 0) {
            console.log("Menu already exists. Skipping insertion.");
            process.exit(0);
        }

        // 3. Insert Menu
        const [insertRes] = await pool.execute(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ['Nayaxa Intelligence', 'menu2', 'nayaxa-knowledge', 'Brain', parentId, 99, 1]
        );
        const newMenuId = insertRes.insertId;
        console.log(`Menu 'Nayaxa Intelligence' registered with ID: ${newMenuId}`);

        // 4. Auto-grant to Superadmin (Role ID 1)
        await pool.execute(
            "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)",
            [1, newMenuId]
        );
        console.log("Access granted to Superadmin.");

    } catch (e) {
        console.error("Failed to register menu:", e.message);
    } finally {
        process.exit(0);
    }
}
registerMenu();
