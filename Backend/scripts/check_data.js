const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/src/.env' });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- MENU DATA ---');
        const [menus] = await pool.query('SELECT id, nama_menu, parent_id, action_page FROM menus');
        console.log(JSON.stringify(menus, null, 2));

        console.log('\n--- MASTER DATA CONFIG ---');
        const [configs] = await pool.query('SELECT id, nama_tabel, label FROM master_data_config');
        console.log(JSON.stringify(configs, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
