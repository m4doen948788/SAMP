const path = require('path');
let pool;
try {
    pool = require('../../../src/config/db');
} catch (e) {
    pool = require('../../src/config/db');
}

const runMigration = async () => {
    try {
        console.log('🔄 Menjalankan migrasi Draft Jadwal Kegiatan & Tim...');

        // 1. Table draft_jadwal_kegiatan
        await pool.query(`
            CREATE TABLE IF NOT EXISTS draft_jadwal_kegiatan (
                id INT(11) NOT NULL AUTO_INCREMENT,
                nama_kegiatan VARCHAR(255) NOT NULL,
                tanggal_mulai DATE DEFAULT NULL,
                tanggal_akhir DATE DEFAULT NULL,
                kota_kabupaten_id VARCHAR(10) DEFAULT NULL,
                kecamatan_id VARCHAR(255) DEFAULT NULL,
                lokasi_detail VARCHAR(255) DEFAULT NULL,
                jenis_kegiatan_id INT(11) NOT NULL,
                bidang_ids VARCHAR(255) DEFAULT NULL,
                petugas_ids TEXT DEFAULT NULL,
                keterangan TEXT DEFAULT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                deleted_at DATETIME DEFAULT NULL,
                deleted_by INT(11) DEFAULT NULL,
                kegiatan_manajemen_id INT(11) DEFAULT NULL,
                ketua_tim_id INT(11) DEFAULT NULL,
                catatan_katim TEXT DEFAULT NULL,
                approved_by INT(11) DEFAULT NULL,
                approved_at DATETIME DEFAULT NULL,
                created_by INT(11) DEFAULT NULL,
                updated_by INT(11) DEFAULT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_tanggal (tanggal_mulai, tanggal_akhir),
                KEY idx_status (status),
                KEY idx_djk_is_deleted (is_deleted)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Check & add any missing columns in draft_jadwal_kegiatan
        const [djkCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'draft_jadwal_kegiatan'
        `);
        const existingDjkCols = new Set(djkCols.map(c => c.COLUMN_NAME));

        const addColIfMissing = async (colName, colDef) => {
            if (!existingDjkCols.has(colName)) {
                console.log(`Menambahkan kolom ${colName} ke draft_jadwal_kegiatan...`);
                await pool.query(`ALTER TABLE draft_jadwal_kegiatan ADD COLUMN ${colDef}`);
            }
        };

        await addColIfMissing('is_deleted', 'is_deleted TINYINT(1) NOT NULL DEFAULT 0');
        await addColIfMissing('deleted_at', 'deleted_at DATETIME DEFAULT NULL');
        await addColIfMissing('deleted_by', 'deleted_by INT(11) DEFAULT NULL');
        await addColIfMissing('ketua_tim_id', 'ketua_tim_id INT(11) DEFAULT NULL');
        await addColIfMissing('catatan_katim', 'catatan_katim TEXT DEFAULT NULL');
        await addColIfMissing('approved_by', 'approved_by INT(11) DEFAULT NULL');
        await addColIfMissing('approved_at', 'approved_at DATETIME DEFAULT NULL');
        await addColIfMissing('visibility', "visibility VARCHAR(20) NOT NULL DEFAULT 'bidang'");

        // 2. Table draft_jadwal_tim
        await pool.query(`
            CREATE TABLE IF NOT EXISTS draft_jadwal_tim (
                id INT(11) NOT NULL AUTO_INCREMENT,
                draft_id INT(11) NOT NULL,
                nama_tim VARCHAR(100) NOT NULL,
                tanggal_mulai DATE DEFAULT NULL,
                tanggal_akhir DATE DEFAULT NULL,
                kota_kabupaten_id VARCHAR(10) DEFAULT NULL,
                kecamatan_id VARCHAR(255) DEFAULT NULL,
                lokasi_detail VARCHAR(255) DEFAULT NULL,
                petugas_ids TEXT DEFAULT NULL,
                keterangan TEXT DEFAULT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                deleted_at DATETIME DEFAULT NULL,
                deleted_by INT(11) DEFAULT NULL,
                kegiatan_manajemen_id INT(11) DEFAULT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_draft_id (draft_id),
                KEY idx_status (status),
                KEY idx_djt_is_deleted (is_deleted)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Table draft_jadwal_edit_history
        await pool.query(`
            CREATE TABLE IF NOT EXISTS draft_jadwal_edit_history (
                id INT(11) NOT NULL AUTO_INCREMENT,
                draft_id INT(11) NOT NULL,
                user_id INT(11) DEFAULT NULL,
                aksi VARCHAR(50) NOT NULL,
                keterangan TEXT DEFAULT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_draft_id (draft_id),
                KEY idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Menu kelola_menu & role_menu_access
        const [existingMenu] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = 'draft-jadwal' LIMIT 1");
        if (existingMenu.length === 0) {
            console.log('Menambahkan menu Draft Jadwal ke kelola_menu...');
            const [insertRes] = await pool.query(`
                INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
                VALUES ('Draft Jadwal', 'menu3', 'draft-jadwal', 'CalendarPlus', 109, 4, 1)
            `);
            const menuId = insertRes.insertId;

            // Copy role permissions from menu 108 (Daftar Kegiatan)
            const [roles108] = await pool.query('SELECT role_id FROM role_menu_access WHERE menu_id = 108');
            for (const r of roles108) {
                await pool.query(
                    'INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)',
                    [r.role_id, menuId]
                );
            }
            console.log(`✅ Hak akses disalin ke menu Draft Jadwal (ID: ${menuId})`);
        }

        console.log('✅ Migrasi Draft Jadwal selesai!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error migrasi Draft Jadwal:', err);
        process.exit(1);
    }
};

runMigration();
