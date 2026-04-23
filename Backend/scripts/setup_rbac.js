const pool = require('./src/config/db');

async function setupRbacTable() {
    try {
        console.log('Creating role_menu_access table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_menu_access (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL,
                menu_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_role_menu (role_id, menu_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ role_menu_access table created successfully.');

        // Seed with Super Admin having access to all current menus
        console.log('Seeding initial Super Admin access...');

        // 1 is typically Super Admin role ID.
        const [menus] = await pool.query('SELECT id FROM kelola_menu');

        for (const menu of menus) {
            await pool.query(
                'INSERT IGNORE INTO role_menu_access (role_id, menu_id) VALUES (?, ?)',
                [1, menu.id]
            );
        }
        console.log('✅ Initial Super Admin access seeded successfully.');

    } catch (err) {
        console.error('Error creating role_menu_access table:', err);
    } finally {
        process.exit();
    }
}

setupRbacTable();
