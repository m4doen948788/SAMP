const pool = require('./Backend/src/config/db');

async function addKegiatanMenu() {
    try {
        // Find "Instansi Daerah" or "INTERNAL PPM" parent menu
        const [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu IN ('Instansi Daerah', 'INTERNAL PPM') AND tipe = 'menu1'");

        if (parents.length === 0) {
            console.error('Parent menu "Instansi Daerah" not found.');
            process.exit(1);
        }

        const parentId = parents[0].id;

        // Check if menu already exists
        const [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'kegiatan-per-orang'");
        if (existing.length > 0) {
            console.log('Menu "Kegiatan Per Orang" already exists.');
            process.exit(0);
        }

        // Get max urutan for this parent
        const [maxUrutan] = await pool.query("SELECT MAX(urutan) as maxU FROM kelola_menu WHERE parent_id = ?", [parentId]);
        const nextUrutan = (maxUrutan[0].maxU || 0) + 1;

        await pool.query(`
            INSERT INTO kelola_menu (nama_menu, tipe, parent_id, action_page, icon, urutan, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['Kegiatan Per Orang', 'menu2', parentId, 'kegiatan-per-orang', 'Calendar', nextUrutan, 1]);

        console.log('Menu "Kegiatan Per Orang" added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to add menu:', err.message);
        process.exit(1);
    }
}

addKegiatanMenu();
