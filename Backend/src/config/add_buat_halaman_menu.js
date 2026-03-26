const pool = require('./db');

async function addBuatHalamanMenu() {
    try {
        // Find KELOLA APLIKASI menu item
        const [parents] = await pool.query(
            "SELECT id FROM kelola_menu WHERE nama_menu = 'KELOLA APLIKASI' AND parent_id IS NULL LIMIT 1"
        );

        if (parents.length === 0) {
            console.log('KELOLA APLIKASI menu not found! Cannot add sub-menu.');
            process.exit(1);
        }

        const parentId = parents[0].id;
        console.log(`Found KELOLA APLIKASI with id: ${parentId}`);

        // Check if BUAT HALAMAN already exists
        const [existing] = await pool.query(
            "SELECT id FROM kelola_menu WHERE nama_menu = 'BUAT HALAMAN' AND parent_id = ?",
            [parentId]
        );

        if (existing.length > 0) {
            console.log('BUAT HALAMAN already exists, skipping.');
            process.exit(0);
        }

        // Get max urutan for children of KELOLA APLIKASI
        const [maxOrder] = await pool.query(
            "SELECT COALESCE(MAX(urutan), 0) as maxUrutan FROM kelola_menu WHERE parent_id = ?",
            [parentId]
        );

        const newUrutan = maxOrder[0].maxUrutan + 1;

        // Insert BUAT HALAMAN as menu2 under KELOLA APLIKASI
        const [result] = await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            ['BUAT HALAMAN', 'menu2', 'buat-halaman', parentId, newUrutan, 1]
        );

        console.log(`BUAT HALAMAN menu created with id: ${result.insertId}, urutan: ${newUrutan}`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

addBuatHalamanMenu();
