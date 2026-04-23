const pool = require('./src/config/db');

async function addHakAksesMenu() {
    try {
        console.log('Adding "Manajemen Hak Akses" to kelola_menu...');

        // Check if "PENGATURAN" group exists, otherwise create it
        let [pengaturanRows] = await pool.query('SELECT id FROM kelola_menu WHERE nama_menu = "PENGATURAN" AND parent_id IS NULL');
        let parentId = null;

        if (pengaturanRows.length === 0) {
            const [result] = await pool.query(`
                INSERT INTO kelola_menu (nama_menu, tipe, icon, urutan, is_active)
                VALUES ('PENGATURAN', 'menu1', 'Settings', 99, 1)
            `);
            parentId = result.insertId;
        } else {
            parentId = pengaturanRows[0].id;
        }

        // Add Manajemen Hak Akses
        const [existing] = await pool.query('SELECT id FROM kelola_menu WHERE action_page = "manajemen-hak-akses"');

        if (existing.length === 0) {
            const [insertRes] = await pool.query(`
                INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active)
                VALUES ('Manajemen Hak Akses', 'menu2', 'manajemen-hak-akses', ?, 5, 1)
            `, [parentId]);

            // Give Super Admin access
            await pool.query('INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)', [1, insertRes.insertId]);
            await pool.query('INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)', [1, parentId]);

            console.log('✅ Menu "Manajemen Hak Akses" added successfully.');
        } else {
            console.log('Menu already exists.');
        }

    } catch (err) {
        console.error('Error adding menu:', err);
    } finally {
        process.exit();
    }
}

addHakAksesMenu();
