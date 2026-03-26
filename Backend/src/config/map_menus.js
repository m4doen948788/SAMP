const pool = require('./db');

async function mapMenus() {
    try {
        // Map menus to their aplikasi_external based on previous conversation history
        const mappings = [
            { menu: 'TANDA TANGAN ELEKTRONIK', app_id: 1 }, // E-Sign
            { menu: 'DISPOSISI', app_id: 2 },                // CMS
            { menu: 'BOOKING', app_id: 3 },                  // CBS
        ];

        for (const m of mappings) {
            const [result] = await pool.query(
                'UPDATE kelola_menu SET aplikasi_external_id = ? WHERE nama_menu = ?',
                [m.app_id, m.menu]
            );
            console.log(`${m.menu} → app_id: ${m.app_id} (${result.affectedRows} row updated)`);
        }

        console.log('\nMapping completed!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
mapMenus();
