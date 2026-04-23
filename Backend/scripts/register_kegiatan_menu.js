const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function registerMenu() {
  try {
    console.log('Registering "Isi Kegiatan" menu...');

    // 1. Shift "Kelola Dokumen" and others if needed
    // We want "Isi Kegiatan" above "Kelola Dokumen" (id: 107)
    // Current urutan for 107 is 8.
    
    // First, increase urutan for everything >= 8 by 1
    await pool.query('UPDATE kelola_menu SET urutan = urutan + 1 WHERE urutan >= 8');
    console.log('Shifted existing menus.');

    // 2. Insert new menu
    const [result] = await pool.query(`
      INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, urutan, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['Isi Kegiatan', 'menu1', 'isi-kegiatan', 'Calendar', 8, 1]);
    
    const newMenuId = result.insertId;
    console.log(`Menu "Isi Kegiatan" registered with ID: ${newMenuId} and urutan: 8`);

    // 3. Grant access to Super Admin (tipe_user_id: 1)
    await pool.query(`
      INSERT INTO role_menu_access (role_id, menu_id)
      VALUES (?, ?)
    `, [1, newMenuId]);
    console.log('Granted access to Super Admin.');

    console.log('Menu registration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Menu registration failed:', err.message);
    process.exit(1);
  }
}

registerMenu();
