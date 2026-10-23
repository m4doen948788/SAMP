const pool = require('../src/config/db');

async function createKksTables() {
  console.log('--- Memulai pembuatan tabel KKS (Kabupaten Kota Sehat) ---');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. kks_periode
    console.log('1. Membuat tabel kks_periode...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_periode (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tahun INT NOT NULL UNIQUE,
        nama_periode VARCHAR(150) NOT NULL,
        status ENUM('draft', 'buka_pengisian', 'masa_verifikasi', 'selesai', 'arsip') DEFAULT 'buka_pengisian',
        tanggal_mulai_pengisian DATE NULL,
        tanggal_selesai_pengisian DATE NULL,
        target_predikat VARCHAR(50) DEFAULT 'Swasti Saba Wistara',
        keterangan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. kks_tatanan
    console.log('2. Membuat tabel kks_tatanan...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_tatanan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tahun INT NOT NULL,
        nomor_tatanan INT NOT NULL,
        kode_tatanan VARCHAR(50) NOT NULL,
        nama_tatanan VARCHAR(255) NOT NULL,
        deskripsi TEXT NULL,
        bobot DECIMAL(5,2) DEFAULT 0.00,
        icon VARCHAR(50) DEFAULT 'Layers',
        warna_tema VARCHAR(30) DEFAULT 'emerald',
        urutan INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tatanan_tahun (tahun),
        INDEX idx_tatanan_nomor (nomor_tatanan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. kks_indikator
    console.log('3. Membuat tabel kks_indikator...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_indikator (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tahun INT NOT NULL,
        tatanan_id INT NOT NULL,
        nomor_indikator VARCHAR(50) NOT NULL,
        nama_indikator VARCHAR(500) NOT NULL,
        definisi_operasional TEXT NULL,
        sumber_data TEXT NULL,
        bukti_dukung_dibutuhkan TEXT NULL,
        instansi_pengampu_id INT NULL,
        instansi_pengampu_nama VARCHAR(150) NULL,
        crosscutting_instansi_ids VARCHAR(255) NULL,
        catatan_khusus TEXT NULL,
        urutan INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_indikator_tahun (tahun),
        INDEX idx_indikator_tatanan (tatanan_id),
        INDEX idx_indikator_instansi (instansi_pengampu_id),
        CONSTRAINT fk_kks_ind_tatanan FOREIGN KEY (tatanan_id) REFERENCES kks_tatanan (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. kks_kriteria_skala
    console.log('4. Membuat tabel kks_kriteria_skala...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_kriteria_skala (
        id INT AUTO_INCREMENT PRIMARY KEY,
        indikator_id INT NOT NULL,
        skor INT NOT NULL,
        kriteria TEXT NOT NULL,
        urutan INT DEFAULT 1,
        INDEX idx_kriteria_indikator (indikator_id),
        CONSTRAINT fk_kks_kriteria_ind FOREIGN KEY (indikator_id) REFERENCES kks_indikator (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. kks_penilaian_mandiri
    console.log('5. Membuat tabel kks_penilaian_mandiri...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_penilaian_mandiri (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tahun INT NOT NULL,
        indikator_id INT NOT NULL,
        instansi_id INT NOT NULL,
        skor_mandiri INT NULL,
        catatan_opd TEXT NULL,
        status_pengisian ENUM('belum_diisi', 'draft', 'siap_verifikasi') DEFAULT 'belum_diisi',
        submitted_at DATETIME NULL,
        user_id_pengisi INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_kks_penilaian (tahun, indikator_id, instansi_id),
        INDEX idx_penilaian_tahun_opd (tahun, instansi_id),
        CONSTRAINT fk_kks_pen_ind FOREIGN KEY (indikator_id) REFERENCES kks_indikator (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. kks_bukti_dukung
    console.log('6. Membuat tabel kks_bukti_dukung...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_bukti_dukung (
        id INT AUTO_INCREMENT PRIMARY KEY,
        penilaian_id INT NOT NULL,
        tipe_sumber ENUM('file_upload', 'link_url') DEFAULT 'file_upload',
        tahun_dokumen INT NULL DEFAULT 2025,
        nama_berkas VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NULL,
        url_external TEXT NULL,
        ukuran_file INT NULL,
        ekstensi VARCHAR(20) NULL,
        hash VARCHAR(64) NULL,
        keterangan TEXT NULL,
        uploaded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bukti_penilaian (penilaian_id),
        INDEX idx_bukti_hash (hash),
        INDEX idx_bukti_tahun_dok (tahun_dokumen),
        CONSTRAINT fk_kks_bukti_pen FOREIGN KEY (penilaian_id) REFERENCES kks_penilaian_mandiri (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. kks_verifikasi
    console.log('7. Membuat tabel kks_verifikasi...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kks_verifikasi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        penilaian_id INT NOT NULL UNIQUE,
        skor_verifikasi INT NULL,
        status_verifikasi ENUM('menunggu', 'disetujui', 'perlu_perbaikan', 'ditolak') DEFAULT 'menunggu',
        catatan_rekomendasi TEXT NULL,
        verifikator_id INT NULL,
        verified_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_verifikasi_status (status_verifikasi),
        CONSTRAINT fk_kks_ver_pen FOREIGN KEY (penilaian_id) REFERENCES kks_penilaian_mandiri (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.commit();
    console.log('✅ SELURUH TABEL KKS BERHASIL DIBUAT DENGAN SUKSES!');
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    console.error('❌ Terjadi kesalahan saat membuat tabel KKS:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

createKksTables();
