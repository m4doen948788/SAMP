const pool = require('./db');

async function addMenu() {
    try {
        const [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER DATA' AND parent_id IS NULL");
        if (parents.length === 0) { console.log('MASTER DATA not found'); process.exit(1); }
        const parentId = parents[0].id;

        const [existing] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'MASTER INSTANSI DAERAH' AND parent_id = ?", [parentId]);
        if (existing.length > 0) { console.log('Already exists'); process.exit(0); }

        const [maxRow] = await pool.query("SELECT MAX(urutan) as mx FROM kelola_menu WHERE parent_id = ?", [parentId]);
        const nextUrutan = (maxRow[0].mx || 0) + 1;

        await pool.query(
            "INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES ('MASTER INSTANSI DAERAH', 'menu2', 'master-instansi-daerah', ?, ?, 1)",
            [parentId, nextUrutan]
        );
        console.log(`MASTER INSTANSI DAERAH added (urutan: ${nextUrutan})`);
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
addMenu();
