const pool = require('../../../src/config/db');

async function up() {
    const connection = await pool.getConnection();
    try {
        console.log('Membuat tabel surat_global_settings...');
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS surat_global_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instansi_id INT UNIQUE NULL,
                font_family VARCHAR(50) DEFAULT 'Arial',
                font_size INT DEFAULT 12,
                line_height FLOAT DEFAULT 1.5,
                text_align VARCHAR(20) DEFAULT 'justify',
                paper_size VARCHAR(20) DEFAULT 'A4',
                margin_top INT DEFAULT 20,
                margin_bottom INT DEFAULT 20,
                margin_left INT DEFAULT 30,
                margin_right INT DEFAULT 20,
                paragraph_spacing_before FLOAT DEFAULT 0,
                paragraph_spacing_after FLOAT DEFAULT 0,
                first_line_indent FLOAT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        
        await connection.query(createTableSQL);
        console.log('OK: Tabel surat_global_settings berhasil dibuat atau sudah ada');

        // Seed default global settings (instansi_id is null) if not exists
        const [rows] = await connection.query('SELECT * FROM surat_global_settings WHERE instansi_id IS NULL');
        if (rows.length === 0) {
            console.log('Seeding default global settings...');
            await connection.query(`
                INSERT INTO surat_global_settings 
                (font_family, font_size, line_height, text_align, paper_size, margin_top, margin_bottom, margin_left, margin_right)
                VALUES 
                ('Arial', 12, 1.35, 'justify', 'A4', 20, 20, 30, 20)
            `);
            console.log('OK: Default global settings berhasil di-seed');
        } else {
            console.log('SKIP: Default global settings sudah ada');
        }

        console.log('Migrasi 003_create_surat_global_settings selesai.');
        process.exit(0);
    } catch (error) {
        console.error('Error saat menjalankan migrasi:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

up();
