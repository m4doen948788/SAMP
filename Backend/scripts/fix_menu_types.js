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
        const query = `
      UPDATE kelola_menu 
      SET tipe = 'menu1' 
      WHERE action_page IN ('/master-bidang-instansi', '/master-sub-bidang-instansi', 'profil-saya')
    `;
        const [result] = await pool.query(query);
        console.log("Updated", result.affectedRows, "menus to menu1");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
