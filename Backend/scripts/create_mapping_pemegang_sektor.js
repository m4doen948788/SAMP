const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/.env' });

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Creating table mapping_pemegang_sektor...');
        await p.query(`
            CREATE TABLE IF NOT EXISTS mapping_pemegang_sektor (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pegawai_id INT NOT NULL,
                instansi_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_pegawai_instansi (pegawai_id, instansi_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table created successfully.');
    } catch (err) {
        console.error('Error creating table:', err.message);
    } finally {
        await p.end();
    }
})();
