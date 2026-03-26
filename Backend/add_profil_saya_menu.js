const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [ex] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", ['profil-saya']);
        if (ex.length === 0) {
            await pool.query("INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu1', ?, ?, ?, ?, ?)",
                ['Profil Saya', 'profil-saya', 'User', null, 99, 1]
            );
            console.log("Added Profil Saya to menu");
        } else {
            console.log("Profil Saya already in menu");
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
