const pool = require('../src/config/db');

async function run() {
    try {
        console.log('Starting migration...');
        
        // 1. Add nomor_suffix to surat_nomor_log
        // Check if exists first to avoid error on retry
        const [cols] = await pool.query("SHOW COLUMNS FROM surat_nomor_log LIKE 'nomor_suffix'");
        if (cols.length === 0) {
            await pool.query('ALTER TABLE surat_nomor_log ADD COLUMN nomor_suffix VARCHAR(5) NULL AFTER nomor_urut');
            console.log('Added nomor_suffix to surat_nomor_log');
        } else {
            console.log('nomor_suffix already exists');
        }

        // 2. Create surat_numbering_settings
        await pool.query(`CREATE TABLE IF NOT EXISTS surat_numbering_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            instansi_id INT NOT NULL,
            slot_size INT DEFAULT 15,
            buffer_size INT DEFAULT 5,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('Created surat_numbering_settings table');

        // 3. Create surat_daily_slots
        await pool.query(`CREATE TABLE IF NOT EXISTS surat_daily_slots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            instansi_id INT NOT NULL,
            tanggal DATE NOT NULL,
            start_number INT NOT NULL,
            end_number INT NOT NULL,
            UNIQUE KEY idx_tanggal_instansi (tanggal, instansi_id)
        )`);
        console.log('Created surat_daily_slots table');

        // 4. Register Menu
        const [existingMenu] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'pengaturan-penomoran'");
        if (existingMenu.length === 0) {
            const [menus] = await pool.query("SELECT id, parent_id FROM kelola_menu WHERE action_page = 'manajemen-surat'");
            const parentId = menus.length > 0 ? menus[0].parent_id : null;
            
            await pool.query(`INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) 
                             VALUES ('Pengaturan Penomoran', 'menu2', 'pengaturan-penomoran', 'Settings', ?, 99, 1)`, [parentId]);
            console.log('Registered menu: Pengaturan Penomoran');
        } else {
            console.log('Menu already exists');
        }

        console.log('Migration finished successfully!');
        process.exit(0);
    } catch(e) { 
        console.error('Migration failed:', e); 
        process.exit(1); 
    }
}

run();
