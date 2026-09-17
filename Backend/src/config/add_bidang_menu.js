const pool = require('./db');

async function addBidangMenu() {
    try {
        // Find MASTER DATA parent menu
        const [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER DATA' AND tipe = 'menu1' LIMIT 1");
        if (parents.length === 0) {
            console.error('MASTER DATA menu not found!');
            process.exit(1);
        }
        const parentId = parents[0].id;

        // Check if MASTER BIDANG already exists
        const [existing] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER BIDANG' AND parent_id = ?", [parentId]);
        if (existing.length > 0) {
            console.log('MASTER BIDANG menu already exists. Skipping.');
            process.exit(0);
        }

        // Find max urutan under MASTER DATA
        const [maxOrder] = await pool.query("SELECT COALESCE(MAX(urutan), 0) as max_urutan FROM kelola_menu WHERE parent_id = ?", [parentId]);
        const nextOrder = maxOrder[0].max_urutan + 1;

        // Insert MASTER BIDANG
        await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, 1)",
            ['MASTER BIDANG', 'menu2', 'master-bidang', parentId, nextOrder]
        );
        console.log(`MASTER BIDANG menu inserted under MASTER DATA (parent_id=${parentId}, urutan=${nextOrder})`);
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err.message);
        process.exit(1);
    }
}

addBidangMenu();
