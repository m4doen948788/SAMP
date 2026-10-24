const path = require('path');
const fs = require('fs');

let pool;
try {
    pool = require('../../../src/config/db');
} catch (e) {
    pool = require('../../src/config/db');
}

const runMigration = async () => {
    try {
        console.log('🔄 [KKS Migration] Memulai inisialisasi tabel dan data KKS 2026...');

        // 1. kks_periode
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

        // 2. kks_tatanan
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

        // 3. kks_indikator
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

        // 4. kks_kriteria_skala
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

        // 5. kks_penilaian_mandiri
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

        // 6. kks_bukti_dukung
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

        // 7. kks_verifikasi
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

        // Pastikan kolom dokumen_id ada di kks_bukti_dukung jika tabel sudah dibuat sebelumnya
        const [buktiCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kks_bukti_dukung'
        `);
        const existingBuktiCols = new Set(buktiCols.map(c => c.COLUMN_NAME));
        if (!existingBuktiCols.has('dokumen_id')) {
            console.log('Menambahkan kolom dokumen_id ke kks_bukti_dukung...');
            await pool.query('ALTER TABLE kks_bukti_dukung ADD COLUMN dokumen_id INT NULL AFTER hash, ADD INDEX idx_kks_bukti_dokumen_id (dokumen_id)');
        }

        // Cek & insert periode 2026
        const [periodes] = await pool.query('SELECT id FROM kks_periode WHERE tahun = 2026');
        if (periodes.length === 0) {
            console.log('Menambahkan periode KKS 2026...');
            await pool.query(`
                INSERT INTO kks_periode (tahun, nama_periode, status, target_predikat)
                VALUES (2026, 'Evaluasi KKS Periode 2026-2027', 'buka_pengisian', 'Swasti Saba Wistara')
            `);
        }

        // Cek data tatanan & indikator
        const [tatanans] = await pool.query('SELECT COUNT(*) as total FROM kks_tatanan WHERE tahun = 2026');
        const [indicators] = await pool.query('SELECT COUNT(*) as total FROM kks_indikator WHERE tahun = 2026');

        console.log(`Status data KKS saat ini: ${tatanans[0].total} tatanan, ${indicators[0].total} indikator.`);

        if (tatanans[0].total === 0 || indicators[0].total === 0) {
            console.log('🌱 Melakukan import data seed KKS 2026...');

            let seedFilePath = path.resolve(__dirname, '../../src/modules/kks/seed_data_2026.json');
            if (!fs.existsSync(seedFilePath)) {
                seedFilePath = path.resolve(__dirname, '../../src/modules/kks/models/seed_data_2026.json');
            }

            if (fs.existsSync(seedFilePath)) {
                const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

                // Simpan Tatanan
                const tatananIdMap = {};
                if (tatanans[0].total === 0) {
                    for (const t of seedData.tatanan) {
                        const [insT] = await pool.query(`
                            INSERT INTO kks_tatanan (tahun, nomor_tatanan, kode_tatanan, nama_tatanan, deskripsi, bobot, icon, warna_tema, urutan)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [t.tahun, t.nomor_tatanan, t.kode_tatanan, t.nama_tatanan, t.deskripsi, t.bobot, t.icon, t.warna_tema, t.urutan]);
                        tatananIdMap[t.id] = insT.insertId;
                    }
                    console.log(`✅ ${seedData.tatanan.length} tatanan berhasil diinsert.`);
                } else {
                    const [existT] = await pool.query('SELECT id, nomor_tatanan FROM kks_tatanan WHERE tahun = 2026');
                    for (const t of seedData.tatanan) {
                        const found = existT.find(et => et.nomor_tatanan === t.nomor_tatanan);
                        if (found) tatananIdMap[t.id] = found.id;
                    }
                }

                // Simpan Indikator
                if (indicators[0].total === 0) {
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
                    console.log(`✅ ${seedData.indikator.length} indikator berhasil diinsert.`);

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
                    console.log(`✅ ${seedData.kriteria.length} skala nilai berhasil diinsert.`);
                }
            } else {
                console.error('❌ File seed_data_2026.json tidak ditemukan!');
            }
        }

        console.log('✅ Migrasi KKS selesai dengan sempurna.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal menjalankan migrasi KKS:', err);
        process.exit(1);
    }
};

runMigration();
