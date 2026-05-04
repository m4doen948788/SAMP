const pool = require('../src/config/db');

const createAuditTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(100) NOT NULL,
                table_name VARCHAR(100),
                record_id VARCHAR(100),
                old_values JSON,
                new_values JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id),
                INDEX (action),
                INDEX (table_name),
                INDEX (record_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        console.log('--- CREATING AUDIT LOGS TABLE ---');
        await pool.query(query);
        console.log('✅ Table audit_logs created successfully!');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating audit table:', err.message);
        process.exit(1);
    }
};

createAuditTable();
