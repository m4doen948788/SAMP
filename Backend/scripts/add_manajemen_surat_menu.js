const pool = require('./config/db');

async function addMenuSurat() {
    try {
        console.log('--- Registrasi Menu Manajemen Surat ---');

        // 1. Cek urutan terakhir menu utama (tipe menu1) di KELOLA_MENU
        const [lastMenu] = await pool.query('SELECT MAX(urutan) as max_u FROM kelola_menu WHERE tipe = "menu1"');
        const nextUrutan = (lastMenu[0].max_u || 0) + 1;

        // 2. Tambahkan menu Manajemen Surat ke KELOLA_MENU
        const [result] = await pool.query(`
            INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, urutan, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['Manajemen Surat', 'menu1', 'manajemen-surat', 'Mail', nextUrutan, 1]);

        const menuId = result.insertId;
        console.log(`✅ Menu berhasil dibuat di kelola_menu dengan ID: ${menuId}`);

        // 3. Beri akses ke Super Admin (role_id = 1) di ROLE_MENU_ACCESS
        await pool.query('INSERT INTO role_menu_access (role_id, menu_id) VALUES (1, ?)', [menuId]);

        console.log('✅ Akses Menu didaftarkan untuk Super Admin di role_menu_access.');
    } catch (err) {
        console.error('❌ Gagal:', err.message);
    } finally {
        process.exit();
    }
}

addMenuSurat();
