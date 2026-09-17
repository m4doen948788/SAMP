const pool = require('./src/config/db');

async function checkMenus() {
    try {
        const [rows] = await pool.query('SELECT id, nama_menu, parent_id, action_page FROM menu WHERE parent_id IS NULL');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMenus();
