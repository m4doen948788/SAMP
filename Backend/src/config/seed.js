const pool = require('./db');

async function seed() {
    try {
        // Check if data already exists — skip if not empty
        const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM kelola_menu');
        if (existing[0].cnt > 0) {
            console.log(`Table kelola_menu already has ${existing[0].cnt} rows. Skipping seed to preserve existing data.`);
            console.log('To re-seed, manually run: DELETE FROM kelola_menu;');
            process.exit(0);
            return;
        }

        // Helper to insert and return id
        const insert = async (nama_menu, tipe, opts = {}) => {
            const { aplikasi_external_id = null, action_page = null, icon = null, parent_id = null, urutan = 0 } = opts;
            const [result] = await pool.query(
                'INSERT INTO kelola_menu (nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                [nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan]
            );
            return result.insertId;
        };

        // 1. DASHBOARD PPM (menu1)
        const dashboardId = await insert('DASHBOARD PPM', 'menu1', { icon: 'LayoutDashboard', urutan: 1 });
        await insert('DASHBOARD UTAMA', 'menu2', { action_page: 'dashboard', parent_id: dashboardId, urutan: 1 });
        await insert('DASHBOARD BAPPERIDA', 'menu2', { parent_id: dashboardId, urutan: 2 });
        await insert('WHATSAPP WEB', 'menu2', { parent_id: dashboardId, urutan: 3 });
        await insert('GOOGLE DRIVE PPM', 'menu2', { parent_id: dashboardId, urutan: 4 });

        // 2. MANAJEMEN (menu1)
        const manajemenId = await insert('MANAJEMEN', 'menu1', { icon: 'Users', urutan: 2 });
        await insert('TANDA TANGAN ELEKTRONIK', 'menu2', { aplikasi_external_id: 1, parent_id: manajemenId, urutan: 1 });
        const dataDiriId = await insert('DATA DIRI', 'menu2', { parent_id: manajemenId, urutan: 2 });
        await insert('DOKUMEN DIRI', 'menu3', { parent_id: dataDiriId, urutan: 1 });
        await insert('LHKP', 'menu3', { parent_id: dataDiriId, urutan: 2 });
        await insert('DATA ASN', 'menu3', { parent_id: dataDiriId, urutan: 3 });
        await insert('SKP', 'menu3', { parent_id: dataDiriId, urutan: 4 });
        await insert('DISPOSISI', 'menu2', { aplikasi_external_id: 2, parent_id: manajemenId, urutan: 3 });
        await insert('BOOKING', 'menu2', { aplikasi_external_id: 3, parent_id: manajemenId, urutan: 4 });

        // 3. PERENCANAAN (menu1)
        const perencanaanId = await insert('PERENCANAAN', 'menu1', { icon: 'FileText', urutan: 3 });
        await insert('RPJPD', 'menu2', { parent_id: perencanaanId, urutan: 1 });
        await insert('RPJMD / RENSTRA', 'menu2', { parent_id: perencanaanId, urutan: 2 });
        await insert('RKPD / RENJA REGULER', 'menu2', { parent_id: perencanaanId, urutan: 3 });
        await insert('RKPD / RENJA PERUBAHAN', 'menu2', { parent_id: perencanaanId, urutan: 4 });
        await insert('DAK / BANKEU / HIBAH / BANSOS', 'menu2', { parent_id: perencanaanId, urutan: 5 });

        // 4. PENGANGGARAN (menu1)
        const penganggaranId = await insert('PENGANGGARAN', 'menu1', { icon: 'PieChart', urutan: 4 });
        await insert('KUA PPAS - KUPA PPAS', 'menu2', { parent_id: penganggaranId, urutan: 1 });
        await insert('APBD', 'menu2', { parent_id: penganggaranId, urutan: 2 });
        await insert('DPA - RKA', 'menu2', { parent_id: penganggaranId, urutan: 3 });

        // 5. EVKIN (menu1)
        await insert('EVKIN', 'menu1', { icon: 'FileCheck', urutan: 5 });

        // 6. INTERNAL PPM (menu1)
        const internalId = await insert('INTERNAL PPM', 'menu1', { icon: 'Building2', urutan: 6 });
        await insert('DPA PPM', 'menu2', { parent_id: internalId, urutan: 1 });
        await insert('DAFTAR PEGAWAI PPM', 'menu2', { parent_id: internalId, urutan: 2 });
        await insert('KEGIATAN PER ORANG', 'menu2', { parent_id: internalId, urutan: 3 });

        // 7. REFERENSI (menu1)
        const referensiId = await insert('REFERENSI', 'menu1', { icon: 'BookOpen', urutan: 7 });
        await insert('DATA BPS', 'menu2', { parent_id: referensiId, urutan: 1 });
        await insert('FOTO KEGIATAN', 'menu2', { parent_id: referensiId, urutan: 2 });
        await insert('LINK KERJA', 'menu2', { parent_id: referensiId, urutan: 3 });
        await insert('NOTULENSI & LAPORAN', 'menu2', { parent_id: referensiId, urutan: 4 });
        await insert('PROGRAM-PROGRAM', 'menu2', { parent_id: referensiId, urutan: 5 });
        await insert('PAPARAN', 'menu2', { parent_id: referensiId, urutan: 6 });
        await insert('SINERGITAS / LINTAS SEKTOR', 'menu2', { parent_id: referensiId, urutan: 7 });
        await insert('SURAT-SURAT', 'menu2', { parent_id: referensiId, urutan: 8 });
        await insert('URUSAN / SEKTORAL', 'menu2', { parent_id: referensiId, urutan: 9 });

        // 8. KELOLA APLIKASI (menu1)
        const kelolaAppId = await insert('KELOLA APLIKASI', 'menu1', { icon: 'Settings', urutan: 8 });
        await insert('KELOLA MENU', 'menu2', { action_page: 'kelola-menu', parent_id: kelolaAppId, urutan: 1 });

        // 9. MASTER DATA (menu1)
        const masterDataId = await insert('MASTER DATA', 'menu1', { icon: 'Database', urutan: 9 });
        await insert('MASTER TAHUN', 'menu2', { action_page: 'master-tahun', parent_id: masterDataId, urutan: 1 });
        await insert('MASTER TEMATIK', 'menu2', { action_page: 'master-tematik', parent_id: masterDataId, urutan: 2 });
        await insert('MASTER APLIKASI EXTERNAL', 'menu2', { action_page: 'master-aplikasi-external', parent_id: masterDataId, urutan: 3 });

        console.log('Seed completed successfully. All existing menus inserted.');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    }
}

seed();
