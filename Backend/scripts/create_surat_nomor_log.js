const pool = require('./src/config/db');

async function createTable() {
    try {
        console.log('Creating surat_nomor_log table...');
        
        const query = `
            CREATE TABLE IF NOT EXISTS surat_nomor_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instansi_id INT NOT NULL,
                bidang_id INT NOT NULL,
                kode_klasifikasi VARCHAR(50) NOT NULL,
                nomor_urut INT NOT NULL,
                nomor_surat_full VARCHAR(255) NOT NULL,
                perihal TEXT NOT NULL,
                tanggal_surat DATE NOT NULL,
                tujuan VARCHAR(255),
                jenis_surat ENUM('TTE', 'Manual') DEFAULT 'Manual',
                status ENUM('Digunakan', 'Batal') DEFAULT 'Digunakan',
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (instansi_id),
                INDEX (bidang_id),
                INDEX (created_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        
        await pool.query(query);
        console.log('✅ Table surat_nomor_log created successfully.');
        
        // Also ensure surat_counters has some initial logic or structure check
        // (It already exists based on DESCRIBE check earlier)
        
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        process.exit(0);
    }
}

createTable();
