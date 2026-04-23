const pool = require('./src/config/db');

const migrate = async () => {
    try {
        console.log('Starting migration for kegiatan_manajemen trash and history...');

        // 1. Add is_deleted and deleted_at to kegiatan_manajemen if they don't exist
        const [cols] = await pool.query('SHOW COLUMNS FROM kegiatan_manajemen LIKE "is_deleted"');
        if (cols.length === 0) {
            console.log('Adding is_deleted and deleted_at to kegiatan_manajemen...');
            await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN is_deleted TINYINT(1) DEFAULT 0');
            await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN deleted_at DATETIME DEFAULT NULL');
            console.log('Added cols to kegiatan_manajemen.');
        } else {
            console.log('is_deleted already exists in kegiatan_manajemen.');
        }

        // 2. Create kegiatan_edit_history table
        const createHistoryQuery = `
            CREATE TABLE IF NOT EXISTS kegiatan_edit_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kegiatan_id INT NOT NULL,
                user_id INT,
                aksi ENUM('create', 'edit', 'delete', 'restore') NOT NULL,
                keterangan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (kegiatan_id) REFERENCES kegiatan_manajemen(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `;
        console.log('Creating kegiatan_edit_history table...');
        await pool.query(createHistoryQuery);
        console.log('Table kegiatan_edit_history created successfully!');

        // 3. Mark existing activities as 'create' in history if empty
        const [existingHistory] = await pool.query('SELECT COUNT(*) as count FROM kegiatan_edit_history');
        if (existingHistory[0].count === 0) {
            console.log('Populating initial history for existing activities...');
            const [activities] = await pool.query('SELECT id, created_by, created_at FROM kegiatan_manajemen');
            for (const act of activities) {
                await pool.query(
                    'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan, created_at) VALUES (?, ?, ?, ?, ?)',
                    [act.id, act.created_by, 'create', 'Kegiatan dibuat pertama kali', act.created_at]
                );
            }
            console.log(`Populated history for ${activities.length} activities.`);
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
