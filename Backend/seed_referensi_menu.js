const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedMenu() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Seeding Referensi menu...');

        // 1. Ensure "Perencanaan Pembangunan Terpadu" exists
        const parentName = 'Perencanaan Pembangunan Terpadu';
        let [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = ? AND tipe = 'menu1'", [parentName]);

        let parentId;
        if (parents.length === 0) {
            const [res] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, icon, urutan, is_active) VALUES (?, 'menu1', 'Layout', 50, 1)",
                [parentName]
            );
            parentId = res.insertId;
            console.log(`Created parent menu: ${parentName}`);
        } else {
            parentId = parents[0].id;
            console.log(`Parent menu already exists: ${parentName}`);
        }

        // 2. Add "Referensi" under it
        const menuName = 'Referensi';
        const actionPage = 'referensi-urusan-instansi';
        const [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [actionPage]);

        if (existing.length === 0) {
            await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, 1, 1)",
                [menuName, actionPage, parentId]
            );
            console.log(`Added menu: ${menuName}`);
        } else {
            console.log(`Menu ${menuName} already exists`);
        }

        console.log('Menu seeding completed.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    } finally {
        pool.end();
    }
}

seedMenu();
