const pool = require('./src/config/db');

async function checkMenus() {
    try {
        const [rows] = await pool.query("SELECT id, nama_menu, parent_id, tipe FROM master_menu WHERE is_active = 1");
        console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

checkMenus();
