const pool = require('./src/config/db');

async function run() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Notulen Templates
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notulen_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_template VARCHAR(255) NOT NULL,
                font_family VARCHAR(50) DEFAULT 'Arial',
                font_size INT DEFAULT 12,
                margin_top INT DEFAULT 20,
                margin_bottom INT DEFAULT 20,
                margin_left INT DEFAULT 30,
                margin_right INT DEFAULT 20,
                paper_size VARCHAR(20) DEFAULT 'A4',
                isi_template TEXT,
                is_kop_surat_required BOOLEAN DEFAULT TRUE,
                logo_path VARCHAR(255),
                instansi_id INT,
                line_height DECIMAL(3,2) DEFAULT 1.5,
                text_align VARCHAR(20) DEFAULT 'justify',
                master_dokumen_id INT,
                kop_line_style VARCHAR(50) DEFAULT 'double',
                use_global_settings BOOLEAN DEFAULT TRUE,
                paragraph_spacing_before DECIMAL(4,2) DEFAULT 0,
                paragraph_spacing_after DECIMAL(4,2) DEFAULT 0,
                first_line_indent DECIMAL(4,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. Notulen Global Settings (Using existing or separate? Let's check if we have a global table)
        // Usually global settings are in a specific table or just the first row. 
        // Based on PengaturanSurat, it uses a specific endpoint. I'll check if there's a global_settings table.
        // I'll create one specifically for Notulen to avoid conflict.
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notulen_global_settings (
                id INT PRIMARY KEY DEFAULT 1,
                font_family VARCHAR(50) DEFAULT 'Arial',
                font_size INT DEFAULT 12,
                line_height DECIMAL(3,2) DEFAULT 1.5,
                text_align VARCHAR(20) DEFAULT 'justify',
                paper_size VARCHAR(20) DEFAULT 'A4',
                margin_top INT DEFAULT 20,
                margin_bottom INT DEFAULT 20,
                margin_left INT DEFAULT 30,
                margin_right INT DEFAULT 20,
                paragraph_spacing_before DECIMAL(4,2) DEFAULT 0,
                paragraph_spacing_after DECIMAL(4,2) DEFAULT 0,
                first_line_indent DECIMAL(4,2) DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await connection.query(`INSERT IGNORE INTO notulen_global_settings (id) VALUES (1)`);

        // 3. Notulen Documents
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notulen (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kegiatan_id INT,
                template_id INT,
                nomor_notulen VARCHAR(100),
                perihal VARCHAR(255),
                tanggal_notulen DATE,
                isi_notulen TEXT,
                dokumen_id INT,
                instansi_id INT,
                bidang_id INT,
                created_by INT,
                approval_status ENUM('WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED') DEFAULT 'WAITING_APPROVAL',
                verification_slug VARCHAR(100) UNIQUE,
                is_deleted TINYINT(1) DEFAULT 0,
                deleted_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 4. Notulen Approvals (TTE)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notulen_approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                notulen_id INT,
                approver_id INT,
                role VARCHAR(100),
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED') DEFAULT 'PENDING',
                reason TEXT,
                urutan INT DEFAULT 0,
                signed_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 5. Notulen Edit History
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notulen_edit_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                notulen_id INT,
                user_id INT,
                aksi VARCHAR(50),
                keterangan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.commit();
        console.log('Notulen tables created successfully');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('Error creating Notulen tables:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

run();
