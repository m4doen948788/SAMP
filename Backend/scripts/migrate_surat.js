const pool = require('./config/db');

async function migrate() {
    try {
        console.log('--- Migrasi Modul Surat Dimulai ---');

        // 1. Tambah kolom metadata kop surat di master_instansi_daerah
        console.log('Mengupdate skema master_instansi_daerah...');
        await pool.query(`
            ALTER TABLE master_instansi_daerah 
            ADD COLUMN IF NOT EXISTS alamat_kop TEXT,
            ADD COLUMN IF NOT EXISTS telepon_kop VARCHAR(50),
            ADD COLUMN IF NOT EXISTS faks_kop VARCHAR(50),
            ADD COLUMN IF NOT EXISTS website_kop VARCHAR(255),
            ADD COLUMN IF NOT EXISTS email_kop VARCHAR(255),
            ADD COLUMN IF NOT EXISTS logo_kop_path VARCHAR(255),
            ADD COLUMN IF NOT EXISTS nama_instansi_kop VARCHAR(255)
        `);

        // 2. Buat tabel surat
        console.log('Membuat tabel surat...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS surat (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nomor_surat VARCHAR(100) NOT NULL,
                perihal TEXT NOT NULL,
                asal_surat VARCHAR(255),
                tujuan_surat TEXT,
                tanggal_surat DATE NOT NULL,
                tipe_surat ENUM('masuk', 'keluar') NOT NULL,
                dokumen_id INT,
                instansi_id INT,
                bidang_id INT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (dokumen_id) REFERENCES dokumen_upload(id) ON DELETE SET NULL
            )
        `);

        // 3. Buat tabel counter nomor surat (untuk auto-numbering)
        console.log('Membuat tabel surat_counters...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS surat_counters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instansi_id INT NOT NULL,
                bidang_id INT NOT NULL,
                tahun INT NOT NULL,
                last_number INT DEFAULT 0,
                UNIQUE KEY unique_counter (instansi_id, bidang_id, tahun)
            )
        `);

        console.log('✅ Migrasi Berhasil!');
    } catch (err) {
        console.error('❌ Migrasi Gagal:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
