const pool = require('../../src/config/db');

const up = async () => {
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
    console.log('[011] Table skp_paririmbon_links created successfully.');
    process.exit(0);
};

up().catch(err => {
    console.error('[011] Migration failed:', err.message);
    process.exit(1);
});
