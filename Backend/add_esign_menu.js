const pool = require('./src/config/db');

async function addMenu() {
    try {
        const [result] = await pool.query(
            'INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Kelola E-Signature', 'menu2', 'manajemen-esign', 'PenTool', 40, 110, 1]
        );
        console.log("Menu added with ID:", result.insertId);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

addMenu();
