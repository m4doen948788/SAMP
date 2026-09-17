const pool = require('./src/config/db');

async function moveMenu() {
    try {
        console.log("Moving Nayaxa Intelligence to Kelola Aplikasi sub-menu...");
        
        // 1. Get ID for "Kelola Aplikasi"
        const [parents] = await pool.execute("SELECT id FROM kelola_menu WHERE nama_menu = 'Kelola Aplikasi' LIMIT 1");
        if (parents.length === 0) {
            console.error("Parent 'Kelola Aplikasi' not found.");
            process.exit(1);
        }
        const parentId = parents[0].id;

        // 2. Update Nayaxa Intelligence menu
        const [result] = await pool.execute(
            "UPDATE kelola_menu SET parent_id = ?, tipe = 'menu2' WHERE action_page = 'nayaxa-knowledge'",
            [parentId]
        );
        
        if (result.affectedRows > 0) {
            console.log(`Successfully moved menu to parent ID: ${parentId}`);
        } else {
            console.log("Menu 'nayaxa-knowledge' not found. Creating it instead...");
            // Fallback create if somehow deleted
            const [insertRes] = await pool.execute(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ['Nayaxa Intelligence', 'menu2', 'nayaxa-knowledge', 'Brain', parentId, 99, 1]
            );
            await pool.execute("INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (1, ?)", [insertRes.insertId]);
        }

    } catch (e) {
        console.error("Failed to move menu:", e.message);
    } finally {
        process.exit(0);
    }
}
moveMenu();
