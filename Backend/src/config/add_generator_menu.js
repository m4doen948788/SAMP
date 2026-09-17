const pool = require('./db');

async function addGeneratorMenu() {
    try {
        const [rows] = await pool.query('SELECT id FROM kelola_menu WHERE nama_menu = "KELOLA APLIKASI"');
        if (rows.length === 0) return;

        const parentId = rows[0].id;
        const [urutanRow] = await pool.query('SELECT MAX(urutan) as maxU FROM kelola_menu WHERE parent_id = ?', [parentId]);
        const nextUrutan = (urutanRow[0].maxU || 0) + 1;

        await pool.query(`
      INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['GENERATOR HALAMAN', 'menu1', 'generator-halaman', 'Layout', parentId, nextUrutan, 1]);

        console.log('Menu GENERATOR HALAMAN added.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addGeneratorMenu();
