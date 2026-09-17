const pool = require('./db');

async function addJenisPegawaiMenu() {
    try {
        const [parents] = await pool.query(
            "SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER DATA' AND parent_id IS NULL LIMIT 1"
        );
        if (parents.length === 0) {
            console.log('MASTER DATA menu not found!');
            process.exit(1);
        }
        const parentId = parents[0].id;

        const [existing] = await pool.query(
            "SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER JENIS PEGAWAI' AND parent_id = ?",
            [parentId]
        );
        if (existing.length > 0) {
            console.log('MASTER JENIS PEGAWAI already exists, skipping.');
            process.exit(0);
        }

        const [maxOrder] = await pool.query(
            "SELECT COALESCE(MAX(urutan), 0) as maxUrutan FROM kelola_menu WHERE parent_id = ?",
            [parentId]
        );

        const [result] = await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            ['MASTER JENIS PEGAWAI', 'menu2', 'master-jenis-pegawai', parentId, maxOrder[0].maxUrutan + 1, 1]
        );

        console.log(`MASTER JENIS PEGAWAI menu created with id: ${result.insertId}`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

addJenisPegawaiMenu();
