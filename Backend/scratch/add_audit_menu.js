const pool = require('../src/config/db');

const addMenu = async () => {
    try {
        const [rows] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'audit-trail'");
        if (rows.length > 0) {
            console.log('Audit Trail menu already exists.');
            process.exit(0);
        }

        const [result] = await pool.query(
            'INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Audit Trail', 'menu2', 'audit-trail', 'Activity', 40, 100, 1]
        );
        console.log('Successfully added Audit Trail menu with ID:', result.insertId);
        process.exit(0);
    } catch (err) {
        console.error('Error adding menu:', err.message);
        process.exit(1);
    }
};

addMenu();
