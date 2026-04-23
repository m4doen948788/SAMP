const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMenu() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('=== ADDING BIDANG & SUB BIDANG MENU ===');

        const [parentMenu] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'INTERNAL PPM' LIMIT 1");

        let parentId = null;
        if (parentMenu.length > 0) {
            parentId = parentMenu[0].id;
            console.log(`Found parent menu ID: ${parentId}`);
        } else {
            console.log('Parent menu not found!');
            return;
        }

        const tableName = 'kelola_menu';

        // Check if already exists
        const [existing] = await pool.query(`SELECT id FROM ${tableName} WHERE action_page = 'master-bidang-instansi'`);
        let newMenuId;

        if (existing.length === 0) {
            const [result] = await pool.query(`
                INSERT INTO ${tableName} 
                (nama_menu, tipe, parent_id, urutan, action_page, is_active) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['Bidang & Sub Bidang', 'menu2', parentId, 99, 'master-bidang-instansi', 1]);

            newMenuId = result.insertId;
            console.log(`Added menu with ID: ${newMenuId}`);
        } else {
            newMenuId = existing[0].id;
            console.log(`Menu already exists with ID: ${newMenuId}`);
        }

        const [roles] = await pool.query("SELECT id, tipe_user FROM master_tipe_user WHERE tipe_user IN ('Super Admin', 'Admin Bapperida', 'Admin Instansi')");

        for (const role of roles) {
            const [accessExists] = await pool.query("SELECT * FROM role_menu_access WHERE role_id = ? AND menu_id = ?", [role.id, newMenuId]);
            if (accessExists.length === 0) {
                await pool.query("INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)", [role.id, newMenuId]);
                console.log(`Granted access for role ${role.tipe_user} (${role.id})`);
            } else {
                console.log(`Access for role ${role.tipe_user} already exists.`);
            }
        }

        console.log('=== SUCCESS ===');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

addMenu();
