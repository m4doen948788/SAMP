const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const parentId = 86; // ID of "Referensi Perencanaan"

    const tabs = [
        { nama: 'Pemetaan Bidang Urusan', action: 'mapping-urusan', urutan: 1 },
        { nama: 'Pemetaan Kegiatan & Subkegiatan', action: 'mapping-kegiatan', urutan: 2 },
        { nama: 'Pemetaan Instansi (Koordinasi)', action: 'mapping-instansi', urutan: 3 },
        { nama: 'Pemegang Sektor', action: 'mapping-sektor', urutan: 4 }
    ];

    try {
        console.log('Adding granular access tabs to kelola_menu...');

        for (const tab of tabs) {
            // Check if already exists
            const [existing] = await pool.query(
                'SELECT id FROM kelola_menu WHERE action_page = ? AND parent_id = ?',
                [tab.action, parentId]
            );

            if (existing.length === 0) {
                await pool.query(
                    'INSERT INTO kelola_menu (nama_menu, tipe, action_page, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    [tab.nama, 'menu3', tab.action, parentId, tab.urutan, 1]
                );
                console.log(`Added: ${tab.nama}`);
            } else {
                console.log(`Skipped (already exists): ${tab.nama}`);
            }
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
})();
