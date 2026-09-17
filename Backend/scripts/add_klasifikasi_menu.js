const pool = require('./src/config/db');

async function addMenu() {
    try {
        const parentId = 42; // Master Data
        const menuName = 'Master Klasifikasi Arsip';
        const actionPage = 'master-klasifikasi';
        const icon = 'Hash';
        const tipe = 'menu2';
        
        // Find current max order for this parent
        const [rows] = await pool.query('SELECT MAX(urutan) as max_urutan FROM kelola_menu WHERE parent_id = ?', [parentId]);
        const nextOrder = (rows[0].max_urutan || 0) + 1;

        console.log(`Adding menu: ${menuName} under parent ${parentId}...`);
        
        await pool.query(
            'INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [menuName, tipe, actionPage, icon, parentId, nextOrder, 1]
        );
        
        console.log('✅ Menu added successfully.');
    } catch (err) {
        console.error('Error adding menu:', err);
    } finally {
        process.exit(0);
    }
}

addMenu();
