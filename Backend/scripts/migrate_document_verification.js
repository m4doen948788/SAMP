const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('--- STARTING DOCUMENT VERIFICATION SCHEMA MIGRATION ---');

        // 1. Create master_template_verifikasi table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_template_verifikasi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tahun INT NOT NULL,
                tipe_dokumen VARCHAR(100) NOT NULL,
                nama_file_template VARCHAR(255) NOT NULL,
                path_file_template VARCHAR(255) NOT NULL,
                config_json LONGTEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Table master_template_verifikasi created or verified.');

        // 2. Create transaksi_verifikasi_dokumen table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transaksi_verifikasi_dokumen (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id INT NULL,
                tahun INT NOT NULL,
                pd_id INT NULL,
                nama_dokumen VARCHAR(255) NOT NULL,
                path_file_pdf VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Belum Verifikasi',
                hasil_json LONGTEXT NULL,
                verifier_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Table transaksi_verifikasi_dokumen created or verified.');

        // 3. Seed the Menu Submenu "Verifikasi Dokumen" under parent menu "Olah Data"
        let [parents] = await pool.query("SELECT id FROM kelola_menu WHERE nama_menu = 'Olah Data' LIMIT 1");
        if (parents.length === 0) {
            console.error("❌ Parent menu 'Olah Data' not found in kelola_menu! Please seed 'Olah Data' first.");
            process.exit(1);
        }
        const parentId = parents[0].id;
        console.log(`ℹ️ Parent menu 'Olah Data' found with ID: ${parentId}`);

        const submenuName = 'Verifikasi Dokumen';
        const actionPage = 'olah-data-verifikasi';
        const urutan = 4; // placed after Komparasi RKPD/Renja (urutan 3)

        let [existingMenu] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [actionPage]);
        let menuId;

        if (existingMenu.length === 0) {
            const [res] = await pool.query(
                "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, null, ?, ?, 1)",
                [submenuName, actionPage, parentId, urutan]
            );
            menuId = res.insertId;
            console.log(`✅ Created submenu '${submenuName}' with ID: ${menuId}`);
        } else {
            menuId = existingMenu[0].id;
            await pool.query(
                "UPDATE kelola_menu SET nama_menu = ?, parent_id = ?, urutan = ?, is_active = 1 WHERE id = ?",
                [submenuName, parentId, urutan, menuId]
            );
            console.log(`ℹ️ Submenu '${submenuName}' already exists, updated metadata (ID: ${menuId}).`);
        }

        // 4. Grant access to all roles
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 8];
        }

        console.log(`   Granting access to roles: ${roleIds.join(', ')}`);
        for (const rId of roleIds) {
            await pool.query(
                "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                [rId, menuId]
            );
        }
        console.log('✅ Access granted to all roles successfully.');

        console.log('--- COMPLETED DOCUMENT VERIFICATION SCHEMA MIGRATION ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
