const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [menus] = await pool.query('SELECT * FROM kelola_menu ORDER BY parent_id ASC, urutan ASC');
    console.log('--- ALL MENUS IN KELOLA_MENU ---');
    menus.forEach(m => {
      console.log(`ID: ${m.id}, Name: ${m.nama_menu}, Parent: ${m.parent_id}, Action Page: ${m.action_page}, Urutan: ${m.urutan}, Type: ${m.tipe}`);
    });
  } catch (err) {
    console.error('Error fetching menus:', err);
  }
  await pool.end();
}

run();
