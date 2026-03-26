const db = require('./src/config/db');

(async () => {
    try {
        const [existing] = await db.query('SELECT * FROM kelola_menu WHERE action_page = ?', ['internal-instansi']);
        if (existing.length === 0) {
            await db.query(`INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES ('INTERNAL PPM', 'menu1', 'internal-instansi', 'Users', null, 5, 1)`);
            console.log('Inserted INTERNAL PPM menu');
        } else {
            console.log('Menu already exists');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
