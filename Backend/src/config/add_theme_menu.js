const pool = require('./db');

async function addMenu() {
    try {
        // Find "KELOLA APLIKASI" menu ID
        const [rows] = await pool.query('SELECT id FROM kelola_menu WHERE nama_menu = "KELOLA APLIKASI"');
        if (rows.length === 0) {
            console.error('Menu KELOLA APLIKASI tidak ditemukan');
            process.exit(1);
        }
        const parentId = rows[0].id;

        // Check if already exists
        const [existing] = await pool.query('SELECT id FROM kelola_menu WHERE nama_menu = "PENGATURAN TEMA"');
        if (existing.length > 0) {
            console.log('Menu PENGATURAN TEMA sudah ada.');
            process.exit(0);
        }

        // Get max urutan for this parent
        const [uRows] = await pool.query('SELECT MAX(urutan) as maxU FROM kelola_menu WHERE parent_id = ?', [parentId]);
        const nextUrutan = (uRows[0].maxU || 0) + 1;

        // Insert menu
        await pool.query(`
      INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['PENGATURAN TEMA', 'menu2', 'pengaturan-tema', 'Palette', parentId, nextUrutan, 1]);

        console.log('Menu PENGATURAN TEMA berhasil ditambahkan.');
        process.exit(0);
    } catch (err) {
        console.error('Gagal menambahkan menu:', err.message);
        process.exit(1);
    }
}

addMenu();
