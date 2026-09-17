const pool = require('./src/config/db');

const createDokumenTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS dokumen_upload (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_file VARCHAR(255) NOT NULL,
                path VARCHAR(500) NOT NULL,
                ukuran INT,
                jenis_dokumen_id INT,
                uploaded_by INT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (jenis_dokumen_id) REFERENCES master_jenis_dokumen(id) ON DELETE SET NULL,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            );
        `;

        console.log('Creating dokumen_upload table...');
        await pool.query(query);
        console.log('Table dokumen_upload created successfully!');

        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
};

createDokumenTable();
