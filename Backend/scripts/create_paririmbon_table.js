const pool = require('./src/config/db');

async function main() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS skp_paririmbon_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tahun INT NOT NULL,
                bidang_id INT NOT NULL,
                is_contoh TINYINT(1) NOT NULL DEFAULT 0,
                link_url TEXT NOT NULL,
                updated_by INT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_paririmbon_link (tahun, bidang_id, is_contoh)
            )
        `);
        console.log('Table skp_paririmbon_links created/already exists!');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS skp_pegawai_docs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pegawai_id INT NOT NULL,
                tahun INT NOT NULL,
                bidang_id INT NOT NULL,
                kategori ENUM('perencanaan', 'penilaian', 'pendukung') NOT NULL,
                bulan INT DEFAULT NULL,
                butir_skp VARCHAR(255) DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'Draft',
                doc_name VARCHAR(255) DEFAULT NULL,
                doc_id INT DEFAULT NULL,
                score VARCHAR(50) DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_pegawai_tahun_kategori_bulan_butir_doc (pegawai_id, tahun, bidang_id, kategori, bulan, butir_skp, doc_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Table skp_pegawai_docs created/already exists!');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS skp_monthly_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tahun INT NOT NULL,
                bidang_id INT NOT NULL,
                butir_skp VARCHAR(255) NOT NULL,
                bulan INT NOT NULL,
                link_url TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_tahun_bidang_butir_bulan (tahun, bidang_id, butir_skp, bulan)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Table skp_monthly_links created/already exists!');
        
        // Also record migrations to history if not already there
        try {
            await pool.query(`
                INSERT IGNORE INTO migration_history (filename) VALUES (?)
            `, ['011_create_skp_paririmbon_links.js']);
            await pool.query(`
                INSERT IGNORE INTO migration_history (filename) VALUES (?)
            `, ['012_create_skp_core_tables.js']);
            console.log('Migrations recorded in history.');
        } catch (e) {
            console.log('Could not record to migration_history (table might not exist):', e.message);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
