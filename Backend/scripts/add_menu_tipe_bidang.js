const pool = require('./src/config/db');

async function run() {
    try {
        console.log('Adding Master Tipe Bidang & Sub Bidang to menu and generated pages...');

        // 1. Add to kelola_menu
        const [menuExists] = await pool.query('SELECT id FROM kelola_menu WHERE action_page = ?', ['master-tipe-bidang']);
        if (menuExists.length === 0) {
            await pool.query(
                'INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                ['Master Tipe Bidang', 'menu2', 'master-tipe-bidang', 42, 16, 1]
            );
            console.log('Added Master Tipe Bidang to kelola_menu');
        }

        const [menuSubExists] = await pool.query('SELECT id FROM kelola_menu WHERE action_page = ?', ['master-tipe-sub-bidang']);
        if (menuSubExists.length === 0) {
            await pool.query(
                'INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                ['Master Tipe Sub Bidang', 'menu2', 'master-tipe-sub-bidang', 42, 17, 1]
            );
            console.log('Added Master Tipe Sub Bidang to kelola_menu');
        }

        // 2. Add to generated_pages
        const [genExists] = await pool.query('SELECT id FROM generated_pages WHERE slug = ?', ['master-tipe-bidang']);
        if (genExists.length === 0) {
            await pool.query(
                'INSERT INTO generated_pages (title, slug, table_name, icon, tipe_akses) VALUES (?, ?, ?, ?, ?)',
                ['Master Tipe Bidang', 'master-tipe-bidang', 'master_tipe_bidang', 'Layout', 'Privat']
            );
            console.log('Added Master Tipe Bidang to generated_pages');
        }

        const [genSubExists] = await pool.query('SELECT id FROM generated_pages WHERE slug = ?', ['master-tipe-sub-bidang']);
        if (genSubExists.length === 0) {
            await pool.query(
                'INSERT INTO generated_pages (title, slug, table_name, icon, tipe_akses) VALUES (?, ?, ?, ?, ?)',
                ['Master Tipe Sub Bidang', 'master-tipe-sub-bidang', 'master_tipe_sub_bidang', 'Layout', 'Privat']
            );
            console.log('Added Master Tipe Sub Bidang to generated_pages');
        }

        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
