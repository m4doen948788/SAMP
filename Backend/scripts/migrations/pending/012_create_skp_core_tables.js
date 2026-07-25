const pool = require('../../src/config/db');

const up = async () => {
    try {
        console.log('Creating skp_pegawai_docs table...');
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
        console.log('Table skp_pegawai_docs created successfully.');

        console.log('Creating skp_monthly_links table...');
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
        console.log('Table skp_monthly_links created successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Migration 012 failed:', err.message);
        process.exit(1);
    }
};

up().catch(err => {
    console.error('Unhandled migration error:', err);
    process.exit(1);
});
