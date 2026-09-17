const pool = require('./src/config/db');

const createHistoryTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS dokumen_edit_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                dokumen_id INT NOT NULL,
                user_id INT,
                aksi ENUM('upload', 'edit') DEFAULT 'edit',
                keterangan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dokumen_id) REFERENCES dokumen_upload(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `;

        console.log('Creating dokumen_edit_history table...');
        await pool.query(query);
        console.log('Table dokumen_edit_history created successfully!');

        // Also add updated_at to dokumen_upload if it doesn't exist
        console.log('Checking for updated_at in dokumen_upload...');
        const [cols] = await pool.query('SHOW COLUMNS FROM dokumen_upload LIKE "updated_at"');
        if (cols.length === 0) {
            await pool.query('ALTER TABLE dokumen_upload ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('Added updated_at to dokumen_upload.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error creating history table:', err);
        process.exit(1);
    }
};

createHistoryTable();
