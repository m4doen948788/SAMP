const pool = require('./db');

async function addBuatMasterDataMenu() {
    try {
        const [parents] = await pool.query(
            "SELECT id FROM kelola_menu WHERE nama_menu = 'KELOLA APLIKASI' AND parent_id IS NULL LIMIT 1"
        );
        if (parents.length === 0) {
            console.log('KELOLA APLIKASI not found!');
            process.exit(1);
        }
        const parentId = parents[0].id;

        const [existing] = await pool.query(
            "SELECT id FROM kelola_menu WHERE nama_menu = 'BUAT MASTER DATA' AND parent_id = ?",
            [parentId]
        );
        if (existing.length > 0) {
            console.log('BUAT MASTER DATA already exists, skipping.');
            process.exit(0);
        }

        const [maxOrder] = await pool.query(
            "SELECT COALESCE(MAX(urutan), 0) as maxUrutan FROM kelola_menu WHERE parent_id = ?",
            [parentId]
        );

        const [result] = await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            ['BUAT MASTER DATA', 'menu2', 'buat-master-data', parentId, maxOrder[0].maxUrutan + 1, 1]
        );

        console.log(`BUAT MASTER DATA menu created with id: ${result.insertId}`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

addBuatMasterDataMenu();
