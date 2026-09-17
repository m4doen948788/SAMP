const pool = require('./db');

async function check() {
    try {
        const [apps] = await pool.query('SELECT id, nama_aplikasi, url FROM master_aplikasi_external WHERE deleted_at IS NULL ORDER BY id');
        console.log('=== APLIKASI EXTERNAL ===');
        apps.forEach(a => console.log(`  ID: ${a.id} | ${a.nama_aplikasi} | ${a.url}`));
        console.log(`Total: ${apps.length}`);

        const [menus] = await pool.query('SELECT id, nama_menu, tipe, aplikasi_external_id, action_page, parent_id FROM kelola_menu ORDER BY urutan');
        console.log('\n=== KELOLA MENU ===');
        menus.forEach(m => console.log(`  ID: ${m.id} | ${m.nama_menu} | tipe: ${m.tipe} | app_id: ${m.aplikasi_external_id} | action: ${m.action_page} | parent: ${m.parent_id}`));
        console.log(`Total: ${menus.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
check();
