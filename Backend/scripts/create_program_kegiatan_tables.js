const pool = require('./src/config/db');

async function createTables() {
    try {
        console.log("Starting database migration...");

        // 1. Master Program
        const createProgramQuery = `
            CREATE TABLE IF NOT EXISTS master_program (
                id INT AUTO_INCREMENT PRIMARY KEY,
                urusan_id INT NOT NULL,
                kode_program VARCHAR(50) NOT NULL,
                nama_program TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (urusan_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createProgramQuery);
        console.log("Table 'master_program' created or already exists.");

        // 2. Master Kegiatan
        const createKegiatanQuery = `
            CREATE TABLE IF NOT EXISTS master_kegiatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                program_id INT NOT NULL,
                kode_kegiatan VARCHAR(50) NOT NULL,
                nama_kegiatan TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (program_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createKegiatanQuery);
        console.log("Table 'master_kegiatan' created or already exists.");

        // 3. Master Sub Kegiatan
        const createSubKegiatanQuery = `
            CREATE TABLE IF NOT EXISTS master_sub_kegiatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kegiatan_id INT NOT NULL,
                kode_sub_kegiatan VARCHAR(50) NOT NULL,
                nama_sub_kegiatan TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (kegiatan_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createSubKegiatanQuery);
        console.log("Table 'master_sub_kegiatan' created or already exists.");

        console.log("Database migration completed successfully.");

    } catch (err) {
        console.error("Error during database migration:", err);
    } finally {
        process.exit();
    }
}

createTables();
