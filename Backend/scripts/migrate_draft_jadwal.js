const pool = require('../src/config/db');

async function migrate() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Create table draft_jadwal_kegiatan
        console.log('Creating table draft_jadwal_kegiatan...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS draft_jadwal_kegiatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_kegiatan VARCHAR(255) NOT NULL,
                tanggal_mulai DATE NOT NULL,
                tanggal_akhir DATE NOT NULL,
                kota_kabupaten_id VARCHAR(10) NULL,
                kecamatan_id VARCHAR(10) NULL,
                lokasi_detail VARCHAR(255) NULL,
                jenis_kegiatan_id INT NOT NULL,
                bidang_ids VARCHAR(255) NULL,
                petugas_ids TEXT NOT NULL,
                keterangan TEXT NULL,
                status ENUM('draft', 'terintegrasi') DEFAULT 'draft',
                kegiatan_manajemen_id INT NULL,
                created_by INT NULL,
                updated_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tanggal (tanggal_mulai, tanggal_akhir),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Insert or get menu in kelola_menu
        const [existingMenu] = await conn.query("SELECT id FROM kelola_menu WHERE action_page = 'draft-jadwal' LIMIT 1");
        let menuId;
        if (existingMenu.length === 0) {
            console.log('Inserting Draft Jadwal into kelola_menu...');
            const [insertRes] = await conn.query(`
                INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
                VALUES ('Draft Jadwal', 'menu3', 'draft-jadwal', 'CalendarPlus', 109, 4, 1)
            `);
            menuId = insertRes.insertId;
            console.log('Inserted menu with ID:', menuId);

            // Copy role permissions from menu 108 (Daftar Kegiatan)
            const [roles108] = await conn.query('SELECT role_id FROM role_menu_access WHERE menu_id = 108');
            for (const r of roles108) {
                await conn.query(
                    'INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)',
                    [r.role_id, menuId]
                );
            }
            console.log(`Copied access for ${roles108.length} roles to new menu.`);
        } else {
            menuId = existingMenu[0].id;
            console.log('Menu already exists with ID:', menuId);
        }

        await conn.commit();
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        await conn.rollback();
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        conn.release();
    }
}

migrate();
