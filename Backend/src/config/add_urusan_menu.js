const pool = require('./db');

async function addUrusanMenu() {
    try {
        // Find MASTER DATA parent
        const [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER DATA' AND parent_id IS NULL");
        if (parents.length === 0) {
            console.log('MASTER DATA menu not found');
            process.exit(1);
        }
        const parentId = parents[0].id;

        // Check if already exists
        const [existing] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER URUSAN' AND parent_id = ?", [parentId]);
        if (existing.length > 0) {
            console.log('MASTER URUSAN already exists, skipping');
            process.exit(0);
        }

        // Get max urutan
        const [maxRow] = await pool.query("SELECT MAX(urutan) as mx FROM kelola_menu WHERE parent_id = ?", [parentId]);
        const nextUrutan = (maxRow[0].mx || 0) + 1;

        await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, 'menu2', 'master-urusan', ?, ?, 1)",
            ['MASTER URUSAN', parentId, nextUrutan]
        );
        console.log(`MASTER URUSAN added under MASTER DATA (urutan: ${nextUrutan})`);
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
addUrusanMenu();
