const pool = require('../../../src/config/db');

async function run() {
    try {
        console.log('--- STARTING RPJMD-RENSTRA & RUANG TEMATIK MIGRATION ---');

        // 1. Ensure table tematik_dokumen_wajib exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tematik_dokumen_wajib (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tematik_id INT NOT NULL,
                kode_dokumen VARCHAR(50) NOT NULL,
                judul_dokumen VARCHAR(255) NOT NULL,
                deskripsi TEXT NULL,
                dokumen_id INT NULL,
                file_path VARCHAR(255) NULL,
                file_name VARCHAR(255) NULL,
                nomor_dokumen VARCHAR(100) NULL,
                tahun INT NULL,
                tanggal_penetapan DATE NULL,
                keterangan TEXT NULL,
                updated_by INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tematik_id (tematik_id),
                INDEX idx_kode_dokumen (kode_dokumen)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table tematik_dokumen_wajib verified/created.');

        // 2. Default mandatory document slots
        const defaultSlots = [
            { kode: 'sk_tim', judul: 'SK Tim Koordinasi / Pokja Tematik', desc: 'Surat Keputusan Bupati / Kepala Daerah pembentukan Tim Koordinasi Pokja Tematik.' },
            { kode: 'rad', judul: 'Rencana Aksi Daerah (RAD) / Grand Design', desc: 'Dokumen master plan / rencana aksi lintas sektor pencapaian target tematik.' },
            { kode: 'sop', judul: 'SOP & Pedoman Teknis Pelaksanaan', desc: 'Standar operasional prosedur penanganan, tata laksana, dan intervensi program.' },
            { kode: 'evaluasi', judul: 'Laporan Evaluasi & Monev Berkala', desc: 'Laporan capaian semesteran/tahunan, evaluasi intervensi, dan rekomendasi tindak lanjut.' },
            { kode: 'regulasi', judul: 'Regulasi Daerah / Perbup Pendukung', desc: 'Peraturan Bupati / Daerah yang menjadi payung hukum pelaksanaan tematik.' }
        ];

        // Seed slots for existing master_tematik
        try {
            const [tematiks] = await pool.query('SELECT id, nama FROM master_tematik');
            for (const t of tematiks) {
                for (const slot of defaultSlots) {
                    const [existing] = await pool.query(
                        'SELECT id FROM tematik_dokumen_wajib WHERE tematik_id = ? AND kode_dokumen = ?',
                        [t.id, slot.kode]
                    );
                    if (existing.length === 0) {
                        await pool.query(
                            'INSERT INTO tematik_dokumen_wajib (tematik_id, kode_dokumen, judul_dokumen, deskripsi) VALUES (?, ?, ?, ?)',
                            [t.id, slot.kode, slot.judul, slot.desc]
                        );
                    }
                }
            }
            console.log(`✅ Default mandatory document slots seeded for ${tematiks.length} tematik.`);
        } catch (tErr) {
            console.warn('⚠️ Note on master_tematik query:', tErr.message);
        }

        // 3. Find parent menu for Planning (Perencanaan Pembangunan Terpadu)
        let parentId = null;
        let [parents] = await pool.query(
            "SELECT id FROM kelola_menu WHERE (nama_menu = 'Perencanaan Pembangunan Terpadu' OR nama_menu LIKE '%Perencanaan%') AND parent_id IS NULL LIMIT 1"
        );
        if (parents.length > 0) {
            parentId = parents[0].id;
        } else {
            // Fallback: search parent of rpjpd
            let [rpjpd] = await pool.query("SELECT parent_id FROM kelola_menu WHERE action_page = 'rpjpd' LIMIT 1");
            if (rpjpd.length > 0) parentId = rpjpd[0].parent_id;
        }

        if (!parentId) {
            console.error("❌ Parent planning menu not found!");
            process.exit(1);
        }

        console.log(`ℹ️ Using Parent Planning Menu ID: ${parentId}`);

        // 4. Submenus to add/ensure
        const menusToAdd = [
            {
                nama_menu: 'RPJMD & Renstra 5 Tahunan',
                action_page: 'rpjmd-renstra',
                icon: 'Calendar',
                urutan: 2
            },
            {
                nama_menu: 'Ruang Tematik',
                action_page: 'ruang-tematik',
                icon: 'Layers',
                urutan: 3
            }
        ];

        // 5. Query active role IDs
        let [roles] = await pool.query("SELECT id FROM master_tipe_user");
        let roleIds = roles.map(r => r.id);
        if (roleIds.length === 0) {
            let [distinctRoles] = await pool.query("SELECT DISTINCT role_id FROM role_menu_access");
            roleIds = distinctRoles.map(r => r.role_id);
        }
        if (roleIds.length === 0) {
            roleIds = [1, 2, 3, 4, 5, 6, 8];
        }

        for (const item of menusToAdd) {
            let [existing] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [item.action_page]);
            let menuId;

            if (existing.length === 0) {
                const [res] = await pool.query(
                    "INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, ?, ?, 1)",
                    [item.nama_menu, item.action_page, item.icon, parentId, item.urutan]
                );
                menuId = res.insertId;
                console.log(`✅ Inserted menu '${item.nama_menu}' (action: ${item.action_page}) with ID: ${menuId}`);
            } else {
                menuId = existing[0].id;
                await pool.query(
                    "UPDATE kelola_menu SET nama_menu = ?, tipe = 'menu2', parent_id = ?, icon = ?, is_active = 1 WHERE id = ?",
                    [item.nama_menu, parentId, item.icon, menuId]
                );
                console.log(`ℹ️ Menu '${item.nama_menu}' already exists (ID: ${menuId}), updated to active menu2.`);
            }

            // Grant permission to roles
            for (const rId of roleIds) {
                await pool.query(
                    "INSERT INTO role_menu_access (role_id, menu_id) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id)",
                    [rId, menuId]
                );
            }
        }

        console.log('✅ Role permissions granted for all roles.');
        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

run();
