const pool = require('../Backend/src/config/db');

async function test() {
    try {
        console.log('Fetching access for role 3...');
        const [accessRows] = await pool.query('SELECT menu_id FROM role_menu_access WHERE role_id = ?', [3]);
        const allowedMenuIds = accessRows.map(r => r.menu_id);
        console.log('Original Allowed IDs:', allowedMenuIds);
        
        console.log('Fetching all menus...');
        const [menuRows] = await pool.query('SELECT id, nama_menu, parent_id, action_page, is_active FROM kelola_menu');
        
        let fullAllowedIds = new Set(allowedMenuIds);
        const addParent = (menuId) => {
            const m = menuRows.find(x => x.id === menuId);
            if (m && m.parent_id) {
                if (!fullAllowedIds.has(m.parent_id)) {
                    console.log(`Adding parent ${m.parent_id} for menu ${menuId} (${m.nama_menu})`);
                    fullAllowedIds.add(m.parent_id);
                    addParent(m.parent_id);
                }
            }
        };
        allowedMenuIds.forEach(id => addParent(id));
        
        console.log('Full Allowed IDs:', Array.from(fullAllowedIds));
        
        const idsToCheck = [6, 109, 108, 29];
        console.log('\n--- Status Check ---');
        idsToCheck.forEach(id => {
            const m = menuRows.find(x => x.id === id);
            if (m) {
                console.log(`ID ${id} (${m.nama_menu}): is_active=${m.is_active}, parent_id=${m.parent_id}, in_fullAllowed=${fullAllowedIds.has(id)}`);
            } else {
                console.log(`ID ${id}: NOT FOUND`);
            }
        });

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        pool.end();
        process.exit(0);
    }
}

test();
