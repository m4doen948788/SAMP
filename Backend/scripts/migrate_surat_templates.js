const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('--- Migrasi Tabel Pengaturan Surat Dimulai ---');

        // 1. Buat tabel surat_templates
        console.log('Membuat tabel surat_templates...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS surat_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_jenis_surat VARCHAR(255) NOT NULL,
                font_family VARCHAR(100) DEFAULT 'Arial',
                font_size INT DEFAULT 12,
                margin_top INT DEFAULT 20,
                margin_bottom INT DEFAULT 20,
                margin_left INT DEFAULT 30,
                margin_right INT DEFAULT 20,
                paper_size VARCHAR(50) DEFAULT 'A4',
                is_nomor_surat_required BOOLEAN DEFAULT TRUE,
                is_kop_surat_required BOOLEAN DEFAULT TRUE,
                logo_path VARCHAR(255),
                instansi_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. Seed data awal
        console.log('Seeding data awal...');
        const initialTemplates = [
            ['Surat Cuti', 'Arial', 12, 20, 20, 30, 20, 'A4', true, true, null],
            ['Surat Undangan/Keluar', 'Arial', 12, 20, 20, 30, 20, 'A4', true, true, null]
        ];

        for (const template of initialTemplates) {
            const [exists] = await pool.query('SELECT id FROM surat_templates WHERE nama_jenis_surat = ?', [template[0]]);
            if (exists.length === 0) {
                await pool.query(`
                    INSERT INTO surat_templates 
                    (nama_jenis_surat, font_family, font_size, margin_top, margin_bottom, margin_left, margin_right, paper_size, is_nomor_surat_required, is_kop_surat_required, logo_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, template);
            }
        }

        console.log('✅ Migrasi Berhasil!');
    } catch (err) {
        console.error('❌ Migrasi Gagal:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
