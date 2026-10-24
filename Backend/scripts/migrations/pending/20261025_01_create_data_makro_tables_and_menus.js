const pool = require('../../../src/config/db');

async function run() {
    try {
        console.log('--- STARTING DATA MAKRO TABLES & MENUS MIGRATION ---');

        // 1. Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kode VARCHAR(255) NULL,
                nama_data VARCHAR(255) NOT NULL,
                tematik_id INT NULL,
                sumber_data VARCHAR(255) NULL,
                satuan_id INT NULL,
                urutan INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                parent_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tematik (tematik_id),
                INDEX idx_satuan (satuan_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_nilai (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                tahun INT NOT NULL,
                tipe ENUM('target', 'realisasi') NOT NULL DEFAULT 'realisasi',
                nilai VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                updated_by INT NULL,
                UNIQUE KEY uniq_nilai (data_makro_id, tahun, tipe),
                INDEX idx_makro_id (data_makro_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_otoritas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                profil_pegawai_id INT NOT NULL,
                UNIQUE KEY uniq_otoritas (profil_pegawai_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_pegawai (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                profil_pegawai_id INT NOT NULL,
                UNIQUE KEY uniq_pegawai (data_makro_id, profil_pegawai_id),
                INDEX idx_pegawai (profil_pegawai_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_tematik (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                tematik_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_dmt_makro (data_makro_id),
                INDEX idx_dmt_tematik (tematik_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_dashboard_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_setting (user_id, setting_key),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ Tables data_makro and related tables verified/created.');

        // 2. Seed initial data makro indicators if table is empty
        const [existingMakro] = await pool.query('SELECT COUNT(*) as cnt FROM data_makro');
        if (existingMakro[0].cnt === 0) {
            console.log('Seeding default data makro indicators...');
            const defaultIndicators = [
                { id: 4, kode: 'IPM', nama_data: 'Indeks Pembangunan Manusia (IPM)', sumber_data: 'BPS', satuan_id: 2, urutan: 1 },
                { id: 5, kode: '', nama_data: 'Persentase Penduduk Miskin', sumber_data: 'BPS', satuan_id: 3, urutan: 2 },
                { id: 6, kode: '', nama_data: 'Prevalensi Stunting', sumber_data: 'SKI / SSGI', satuan_id: 3, urutan: 3 },
                { id: 7, kode: '', nama_data: 'Jumlah Penduduk', sumber_data: 'BPS', satuan_id: 1, urutan: 4 }
            ];

            for (const ind of defaultIndicators) {
                await pool.query(
                    'INSERT INTO data_makro (id, kode, nama_data, sumber_data, satuan_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    [ind.id, ind.kode, ind.nama_data, ind.sumber_data, ind.satuan_id, ind.urutan]
                );
            }

            // Seed values
            const defaultValues = [
                [4, 2017, 'realisasi', '69,13'],
                [4, 2018, 'realisasi', '69,69'],
                [4, 2019, 'realisasi', '70,65'],
                [4, 2020, 'realisasi', '71,63'],
                [4, 2021, 'realisasi', '71,83'],
                [4, 2022, 'realisasi', '72,45'],
                [4, 2023, 'realisasi', '73,02'],
                [4, 2024, 'realisasi', '73,63'],
                [4, 2025, 'target', '74,20'],
                [4, 2026, 'target', '74,85'],
                [5, 2017, 'realisasi', '8,57'],
                [5, 2018, 'realisasi', '7,14'],
                [5, 2019, 'realisasi', '6,66'],
                [5, 2020, 'realisasi', '7,69'],
                [5, 2021, 'realisasi', '8,13'],
                [5, 2022, 'realisasi', '7,73'],
                [5, 2023, 'realisasi', '7,27'],
                [5, 2024, 'realisasi', '7,05'],
                [5, 2025, 'realisasi', '6,26'],
                [5, 2026, 'target', '6,10'],
                [6, 2019, 'realisasi', '34,96'],
                [6, 2021, 'realisasi', '28,60'],
                [6, 2022, 'realisasi', '24,90'],
                [6, 2023, 'realisasi', '27,60'],
                [6, 2024, 'realisasi', '18,90'],
                [6, 2025, 'target', '14,00'],
                [7, 2017, 'realisasi', '5.715.009'],
                [7, 2018, 'realisasi', '5.840.907'],
                [7, 2019, 'realisasi', '5.965.410'],
                [7, 2020, 'realisasi', '5.427.068'],
                [7, 2021, 'realisasi', '5.489.536'],
                [7, 2022, 'realisasi', '5.566.838'],
                [7, 2023, 'realisasi', '5.627.021'],
                [7, 2024, 'realisasi', '5.682.303'],
                [7, 2025, 'realisasi', '5.948.925']
            ];

            for (const v of defaultValues) {
                await pool.query(
                    'INSERT IGNORE INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai) VALUES (?, ?, ?, ?)',
                    v
                );
            }

            // Seed tematik relations (Kemiskinan = 2, Stunting = 3)
            await pool.query('INSERT IGNORE INTO data_makro_tematik (data_makro_id, tematik_id) VALUES (5, 2), (6, 3)');
            console.log('✅ Default data makro indicators and values seeded.');
        }

        // 3. Find or ensure Parent Menu ('Referensi')
        let parentId;
        const [refParents] = await pool.query(
            "SELECT id FROM kelola_menu WHERE (nama_menu = 'Referensi' OR nama_menu LIKE '%Referensi%') AND parent_id IS NULL LIMIT 1"
        );

        if (refParents.length > 0) {
            parentId = refParents[0].id;
        } else {
            const [createdParent] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, icon, urutan, is_active) VALUES ('Referensi', 'menu1', 'BookOpen', 8, 1)"
            );
            parentId = createdParent.insertId;
        }

        // 4. Ensure Submenus 'Data Makro' and 'Setting Data Makro'
        const makroSubmenus = [
            {
                nama_menu: 'Data Makro',
                action_page: 'data-makro',
                icon: 'BarChart3',
                urutan: 11
            },
            {
                nama_menu: 'Setting Data Makro',
                action_page: 'setting-data-makro',
                icon: 'SlidersHorizontal',
                urutan: 12
            }
        ];

        const insertedMenuIds = [parentId];

        for (const sub of makroSubmenus) {
            let [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [sub.action_page]);
            let menuId;

            if (existing.length === 0) {
                const [res] = await pool.query(
                    "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, ?, ?, 1)",
                    [sub.nama_menu, sub.action_page, sub.icon, parentId, sub.urutan]
                );
                menuId = res.insertId;
                console.log(`✅ Created menu '${sub.nama_menu}' with ID: ${menuId}`);
            } else {
                menuId = existing[0].id;
                await pool.query(
                    "UPDATE kelola_menu SET nama_menu = ?, tipe = 'menu2', action_page = ?, parent_id = ?, is_active = 1 WHERE id = ?",
                    [sub.nama_menu, sub.action_page, parentId, menuId]
                );
                console.log(`ℹ️ Updated menu '${sub.nama_menu}' (ID: ${menuId}) to active.`);
            }
            insertedMenuIds.push(menuId);
        }

        // 5. Grant permissions to roles in role_menu_access
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 7, 8, 10];
        }

        for (const rId of roleIds) {
            for (const mId of insertedMenuIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, mId]
                );
            }
        }
        console.log(`✅ Granted access for Data Makro menus to roles: ${roleIds.join(', ')}`);

        console.log('--- DATA MAKRO TABLES & MENUS MIGRATION COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
}

run();
