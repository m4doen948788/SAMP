const pool = require('./src/config/db');

async function createTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nip VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                nama_lengkap VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                no_hp VARCHAR(20),
                tipe_user_id INT,
                jenis_pegawai_id INT,
                instansi_id INT,
                jabatan_id INT,
                foto_profil TEXT,
                is_active TINYINT DEFAULT 1,
                last_login_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await pool.query(query);
        console.log("Table 'users' created successfully.");

    } catch (err) {
        console.error("Error creating users table:", err);
    } finally {
        process.exit();
    }
}

createTable();
