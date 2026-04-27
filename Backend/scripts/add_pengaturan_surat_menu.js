const pool = require('../src/config/db');

async function setup() {
    try {
        console.log('--- Setup Peran Arsiparis dan Menu Pengaturan Surat ---');

        // 1. Tambah peran Arsiparis jika belum ada
        const [roles] = await pool.query('SELECT id FROM master_tipe_user WHERE tipe_user = "Arsiparis"');
        let arsiparisRoleId;
        if (roles.length === 0) {
            const [result] = await pool.query('INSERT INTO master_tipe_user (tipe_user) VALUES ("Arsiparis")');
            arsiparisRoleId = result.insertId;
            console.log(`✅ Peran Arsiparis dibuat dengan ID: ${arsiparisRoleId}`);
        } else {
            arsiparisRoleId = roles[0].id;
            console.log(`ℹ️ Peran Arsiparis sudah ada dengan ID: ${arsiparisRoleId}`);
        }

        // 2. Cari parent menu (Manajemen Surat) - ID 114 berdasarkan riset sebelumnya
        // Tapi mari kita pastikan ID 114 adalah benar
        const [parentMenu] = await pool.query('SELECT id FROM kelola_menu WHERE id = 114');
        if (parentMenu.length === 0) {
            console.error('❌ Parent menu (ID 114) tidak ditemukan!');
            process.exit(1);
        }

        // 3. Tambah menu Pengaturan Surat
        const [existingMenu] = await pool.query('SELECT id FROM kelola_menu WHERE action_page = "pengaturan-surat"');
        let menuId;
        if (existingMenu.length === 0) {
            const [result] = await pool.query(`
                INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['Pengaturan Surat', 'menu3', 'pengaturan-surat', 'Settings', 114, 10, 1]);
            menuId = result.insertId;
            console.log(`✅ Menu Pengaturan Surat dibuat dengan ID: ${menuId}`);
        } else {
            menuId = existingMenu[0].id;
            console.log(`ℹ️ Menu Pengaturan Surat sudah ada dengan ID: ${menuId}`);
        }

        // 4. Beri akses ke Superadmin (1), Admin Instansi (2), dan Arsiparis
        const rolesToGrant = [1, 2, arsiparisRoleId];
        for (const roleId of rolesToGrant) {
            const [access] = await pool.query('SELECT * FROM role_menu_access WHERE role_id = ? AND menu_id = ?', [roleId, menuId]);
            if (access.length === 0) {
                await pool.query('INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?)', [roleId, menuId]);
                console.log(`✅ Akses menu diberikan ke role ID: ${roleId}`);
            }
        }

        console.log('--- Setup Selesai ---');
    } catch (err) {
        console.error('❌ Gagal:', err.message);
    } finally {
        process.exit();
    }
}

setup();
