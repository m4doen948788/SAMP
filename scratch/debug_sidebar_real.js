const pool = require('../Backend/src/config/db');

async function debugSidebar() {
    try {
        console.log('--- DEBUG START ---');
        
        // 1. Fetch user (Role 3, Bidang 2)
        const [userRows] = await pool.query('SELECT * FROM profil_pegawai WHERE id = 1');
        const currentUser = userRows[0];
        console.log('User Role:', currentUser.tipe_user_id);

        // 2. Fetch All Menus
        const [menuRows] = await pool.query('SELECT * FROM kelola_menu');
        
        // 3. Fetch Access for Role 3
        const [accessRows] = await pool.query('SELECT menu_id FROM role_menu_access WHERE role_id = ?', [currentUser.tipe_user_id]);
        const allowedMenuIds = accessRows.map(r => r.menu_id);
        
        const isSuperAdmin = currentUser.tipe_user_id === 1;
        
        // Simulating the Sidebar map logic
        let menus = menuRows.filter(m => m.is_active).map(m => {
            // ... (Internal PPM logic omitted for brevity as we are looking for children of 109)
            return m;
        });
        
        // Simulating addParent logic
        let fullAllowedIds = new Set(allowedMenuIds.map(id => Number(id)));
        if (!isSuperAdmin) {
            const addParent = (menuId) => {
                const m = menuRows.find(x => Number(x.id) === Number(menuId));
                if (m && m.parent_id) {
                    const pid = Number(m.parent_id);
                    if (!fullAllowedIds.has(pid)) {
                        fullAllowedIds.add(pid);
                        addParent(pid);
                    }
                }
            };
            allowedMenuIds.forEach(id => addParent(Number(id)));
        }
        
        // Simulating filter logic
        const filteredMenus = menus.filter(m => {
            if (isSuperAdmin) return true;
            return fullAllowedIds.has(Number(m.id));
        });
        
        console.log('Full Allowed IDs count:', fullAllowedIds.size);
        console.log('108 Allowed explicitly?', allowedMenuIds.includes(108));
        console.log('109 In FullAllowed?', fullAllowedIds.has(109));
        console.log('Is 109 (Manajemen Kegiatan) in filtered?', filteredMenus.some(m => m.id === 109));
        console.log('Is 108 (Daftar Kegiatan) in filtered?', filteredMenus.some(m => m.id === 108));
        console.log('Is 29 (Logbook) in filtered?', filteredMenus.some(m => m.id === 29));
        
        const childrenOf109 = filteredMenus.filter(m => m.parent_id === 109);
        console.log('Children of 109:', childrenOf109.length);
        childrenOf109.forEach(c => console.log(` - ID ${c.id}: ${c.nama_menu} (${c.action_page})` ));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
        process.exit(0);
    }
}

debugSidebar();
