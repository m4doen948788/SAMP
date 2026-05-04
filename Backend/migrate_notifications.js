const pool = require('./src/config/db');

async function createNotificationsTable() {
    try {
        console.log('--- Creating Notifications Table ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type VARCHAR(50),
                link VARCHAR(255),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Table notifications created.');
    } catch (err) {
        console.error('Error creating notifications table:', err.message);
    } finally {
        process.exit(0);
    }
}

createNotificationsTable();
