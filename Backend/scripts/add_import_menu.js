const pool = require('./config/db');

async function migrate() {
    try {
        console.log('--- Adding Import Perencanaan Menu ---');
        
        // Find "Master Data" menu as parent
        const [masterMenu] = await pool.query("SELECT id FROM menus WHERE nama_menu = 'MASTER DATA' AND parent_id IS NULL");
        const parentId = masterMenu.length > 0 ? masterMenu[0].id : null;

        // Check if exists
        const [exists] = await pool.query("SELECT id FROM menus WHERE action_page = 'import-perencanaan'");
        
        if (exists.length === 0) {
            const [result] = await pool.query(
                "INSERT INTO menus (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ['Import Perencanaan', 'menu2', 'import-perencanaan', 'Upload', parentId, 99, 1]
            );
            console.log('Menu added with ID:', result.insertId);
        } else {
            console.log('Menu already exists.');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
