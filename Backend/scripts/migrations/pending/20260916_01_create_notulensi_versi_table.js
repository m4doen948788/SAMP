const path = require('path');
let pool;
try {
    pool = require('../../../src/config/db');
} catch (e) {
    pool = require('../../src/config/db');
}

const createNotulensiVersiTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS notulensi_versi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kegiatan_id INT NOT NULL,
                dokumen_id INT NOT NULL,
                versi INT NOT NULL DEFAULT 1,
                nama_file VARCHAR(255) NOT NULL,
                path VARCHAR(500) NOT NULL,
                ukuran INT DEFAULT 0,
                catatan_revisi TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_kegiatan (kegiatan_id),
                INDEX idx_dokumen (dokumen_id),
                INDEX idx_versi (dokumen_id, versi),
                INDEX idx_created_by (created_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `;

        console.log('Creating notulensi_versi table...');
        await pool.query(query);
        console.log('Table notulensi_versi created successfully!');

        process.exit(0);
    } catch (err) {
        console.error('Error creating notulensi_versi table:', err);
        process.exit(1);
    }
};

createNotulensiVersiTable();
