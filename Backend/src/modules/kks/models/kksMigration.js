const pool = require('../../../config/db');
const path = require('path');
const fs = require('fs');

let isInitialized = false;

async function ensureKksTables() {
  if (isInitialized) return true;

  try {
    // 1. Cek apakah tabel kks_periode sudah ada
    const [tables] = await pool.query("SHOW TABLES LIKE 'kks_periode'");
    const tablesExist = tables && tables.length > 0;

    if (!tablesExist) {
      console.log('🔄 [KKS Auto-Migration] Membuat tabel-tabel KKS di database...');

      await pool.query(`
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

      await pool.query(`
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

      await pool.query(`
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

      await pool.query(`
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

      await pool.query(`
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

      await pool.query(`
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
          dokumen_id INT NULL,
          keterangan TEXT NULL,
          uploaded_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_bukti_penilaian (penilaian_id),
          INDEX idx_bukti_hash (hash),
          INDEX idx_bukti_tahun_dok (tahun_dokumen),
          INDEX idx_kks_bukti_dokumen_id (dokumen_id),
          CONSTRAINT fk_kks_bukti_pen FOREIGN KEY (penilaian_id) REFERENCES kks_penilaian_mandiri (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await pool.query(`
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

      console.log('✅ [KKS Auto-Migration] Seluruh tabel KKS berhasil dibuat.');
    }

    // 2. Cek apakah ada data kks_periode 2026
    const [periodes] = await pool.query('SELECT id FROM kks_periode WHERE tahun = 2026');
    if (periodes.length === 0) {
      console.log('🌱 [KKS Auto-Migration] Melakukan seeding periode KKS 2026...');
      await pool.query(`
        INSERT INTO kks_periode (tahun, nama_periode, status, target_predikat)
        VALUES (2026, 'Evaluasi KKS Periode 2026-2027', 'buka_pengisian', 'Swasti Saba Wistara')
      `);
    }

    // 3. Cek apakah ada data kks_indikator 2026
    const [indicators] = await pool.query('SELECT COUNT(*) as total FROM kks_indikator WHERE tahun = 2026');
    if (indicators[0].total === 0) {
      console.log('🌱 [KKS Auto-Migration] Melakukan seeding data tatanan & indikator 2026...');
      const seedFilePath = path.join(__dirname, 'seed_data_2026.json');
      if (fs.existsSync(seedFilePath)) {
        const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

        // Simpan Tatanan
        const tatananIdMap = {}; // oldId -> newId
        for (const t of seedData.tatanan) {
          const [insT] = await pool.query(`
            INSERT INTO kks_tatanan (tahun, nomor_tatanan, kode_tatanan, nama_tatanan, deskripsi, bobot, icon, warna_tema, urutan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [t.tahun, t.nomor_tatanan, t.kode_tatanan, t.nama_tatanan, t.deskripsi, t.bobot, t.icon, t.warna_tema, t.urutan]);
          tatananIdMap[t.id] = insT.insertId;
        }

        // Simpan Indikator
        const indikatorIdMap = {};
        for (const ind of seedData.indikator) {
          const targetTatananId = tatananIdMap[ind.tatanan_id] || ind.tatanan_id;
          const [insInd] = await pool.query(`
            INSERT INTO kks_indikator (
              tahun, tatanan_id, nomor_indikator, nama_indikator, definisi_operasional,
              sumber_data, bukti_dukung_dibutuhkan, instansi_pengampu_id, instansi_pengampu_nama,
              crosscutting_instansi_ids, catatan_khusus, urutan
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            ind.tahun, targetTatananId, ind.nomor_indikator, ind.nama_indikator, ind.definisi_operasional,
            ind.sumber_data, ind.bukti_dukung_dibutuhkan, ind.instansi_pengampu_id, ind.instansi_pengampu_nama,
            ind.crosscutting_instansi_ids, ind.catatan_khusus, ind.urutan
          ]);
          indikatorIdMap[ind.id] = insInd.insertId;
        }

        // Simpan Kriteria
        for (const k of seedData.kriteria) {
          const targetIndId = indikatorIdMap[k.indikator_id];
          if (targetIndId) {
            await pool.query(`
              INSERT INTO kks_kriteria_skala (indikator_id, skor, kriteria, urutan)
              VALUES (?, ?, ?, ?)
            `, [targetIndId, k.skor, k.kriteria, k.urutan]);
          }
        }

        console.log(`✅ [KKS Auto-Migration] Selesai seeding: ${seedData.tatanan.length} tatanan, ${seedData.indikator.length} indikator, ${seedData.kriteria.length} skala nilai.`);
      }
    }

    isInitialized = true;
    return true;
  } catch (err) {
    console.error('❌ [KKS Auto-Migration Error]:', err);
    return false;
  }
}

module.exports = { ensureKksTables };
