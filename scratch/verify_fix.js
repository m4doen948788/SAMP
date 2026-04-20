
// Verification of Sidebar transformation for Role 3

const mockUser = {
    tipe_user_id: 3,
    instansi_id: 2,
    instansi_singkatan: 'Bapperida',
    bidang_singkatan: 'Sekretariat'
};

const mockMenus = [
    { id: 6, nama_menu: 'INTERNAL PPM', parent_id: null, is_active: 1 },
    { id: 109, nama_menu: 'Manajemen Kegiatan', parent_id: 6, is_active: 1 },
    { id: 108, nama_menu: 'Daftar Kegiatan', parent_id: 109, is_active: 1, action_page: 'isi-kegiatan' }
];

const allowedMenuIds = [6, 108]; // Missing 109 explicitly

function processMenus(menuRes, currentUser, isSuperAdmin) {
    let menus = menuRes.filter(m => m.is_active).map(m => {
        if (m.nama_menu === 'INTERNAL PPM') {
            if (isSuperAdmin) {
                return { ...m, nama_menu: 'Instansi Daerah' };
            } else if (currentUser && currentUser.instansi_id) {
                let cleanName = currentUser.instansi_singkatan || (currentUser.instansi_nama || '').replace(/admin/gi, '').trim();
                if (!currentUser.instansi_singkatan && cleanName.toLowerCase().includes('badan perencanaan')) {
                    cleanName = 'Bapperida';
                }
                return { ...m, nama_menu: `Internal ${cleanName}` };
            }
        }
        return m;
    });

    let fullAllowedIds = new Set(allowedMenuIds.map(id => Number(id)));
    if (!isSuperAdmin) {
        const addParent = (menuId) => {
            const m = menuRes.find(x => Number(x.id) === Number(menuId));
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

    const filtered = menus.filter(m => fullAllowedIds.has(m.id));
    return { filtered, fullAllowedIds: Array.from(fullAllowedIds) };
}

const result = processMenus(mockMenus, mockUser, false);
console.log('--- Verification Result ---');
console.log('Resulting FullAllowedIds:', result.fullAllowedIds);
console.log('Renamed Menu 6:', result.filtered.find(m => m.id === 6).nama_menu);
console.log('Is 109 in filtered?', result.filtered.some(m => m.id === 109));

if (result.fullAllowedIds.includes(109) && 
    result.filtered.find(m => m.id === 6).nama_menu === 'Internal Bapperida' &&
    result.filtered.some(m => m.id === 109)) {
    console.log('VERIFICATION SUCCESSFUL');
} else {
    console.log('VERIFICATION FAILED');
}
