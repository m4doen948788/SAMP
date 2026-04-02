const pool = require('./src/config/db');

async function addMenu() {
  try {
    // 1. Dapatkan urutan menu PERENCANAAN dan REFERENSI
    // Karena query di board sering bermasalah dengan case, kita ambil semua menu1
    const [menus] = await pool.query("SELECT id, nama_menu, urutan FROM kelola_menu WHERE tipe = 'menu1' ORDER BY urutan");
    
    let pOrd = 0;
    let rOrd = 1000;
    let foundP = false;
    let foundR = false;

    menus.forEach(m => {
      const name = m.nama_menu.toLowerCase().trim();
      if (name.includes('perencanaan')) {
        pOrd = m.urutan;
        foundP = true;
      }
      if (name.includes('referensi')) {
        rOrd = m.urutan;
        foundR = true;
      }
    });

    console.log(`PERENCANAAN urutan: ${pOrd}, REFERENSI urutan: ${rOrd}`);

    const newUrutan = foundP && foundR ? (pOrd + rOrd) / 2 : (foundP ? pOrd + 1 : 99);
    
    // 2. Cek apakah menu sudah ada
    const [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'manajemen-dokumen'");
    if (existing.length > 0) {
      console.log('Menu Manajemen Dokumen sudah ada, mengupdate urutan...');
      await pool.query("UPDATE kelola_menu SET urutan = ? WHERE action_page = 'manajemen-dokumen'", [newUrutan]);
    } else {
      console.log('Inserting Manajemen Dokumen menu...');
      await pool.query(
        "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        ['Manajemen Dokumen', 'menu1', 'manajemen-dokumen', 'FileText', newUrutan, 1]
      );
    }
    
    console.log('Successfully updated kelola_menu table!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding menu:', err.message);
    process.exit(1);
  }
}

addMenu();
