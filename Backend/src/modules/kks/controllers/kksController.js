const pool = require('../../../config/db');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const xlsx = require('xlsx');
const { ensureKksTables } = require('../models/kksMigration');

// Auto-ensure KKS tables and seed data on startup
ensureKksTables().catch(err => console.error('KKS auto-migration startup error:', err));

// Direktori upload aman (sama dengan standar SAMP)
const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'kks-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung! Khusus penilaian KKS, berkas bukti dukung wajib berupa file PDF.'));
    }
  }
}).single('file');

const kksController = {
  // 1. Executive Summary & Dashboard Utama
  getSummary: async (req, res) => {
    try {
      await ensureKksTables();
      const tahun = parseInt(req.query.tahun || 2026, 10);

      // Ambil data periode
      const [periodeRows] = await pool.query(
        'SELECT * FROM kks_periode WHERE tahun = ?',
        [tahun]
      );
      const periode = periodeRows[0] || { tahun, status: 'buka_pengisian', target_predikat: 'Swasti Saba Wistara' };

      // Ambil tatanan
      const [tatananRows] = await pool.query(
        'SELECT * FROM kks_tatanan WHERE tahun = ? ORDER BY urutan ASC, nomor_tatanan ASC',
        [tahun]
      );

      // Ambil total indikator per tatanan
      const [indStats] = await pool.query(`
        SELECT 
          t.id,
          t.id AS tatanan_id,
          t.nomor_tatanan,
          t.nama_tatanan,
          t.icon,
          t.warna_tema,
          t.bobot,
          COUNT(i.id) AS total_indikator,
          COUNT(DISTINCT pm.id) AS total_diisi,
          COUNT(DISTINCT CASE WHEN v.status_verifikasi = 'disetujui' THEN pm.id END) AS total_disetujui,
          AVG(COALESCE(v.skor_verifikasi, pm.skor_mandiri, 0)) AS avg_skor
        FROM kks_tatanan t
        LEFT JOIN kks_indikator i ON i.tatanan_id = t.id AND i.tahun = t.tahun
        LEFT JOIN kks_penilaian_mandiri pm ON pm.indikator_id = i.id AND pm.tahun = t.tahun
        LEFT JOIN kks_verifikasi v ON v.penilaian_id = pm.id
        WHERE t.tahun = ?
        GROUP BY t.id, t.nomor_tatanan, t.nama_tatanan, t.icon, t.warna_tema, t.bobot
        ORDER BY t.urutan ASC, t.nomor_tatanan ASC
      `, [tahun]);

      // Ambil total agregat
      const [globalStats] = await pool.query(`
        SELECT 
          COUNT(DISTINCT i.id) AS total_indikator,
          COUNT(DISTINCT pm.id) AS total_diisi,
          COUNT(DISTINCT CASE WHEN v.status_verifikasi = 'disetujui' THEN pm.id END) AS total_disetujui,
          COUNT(DISTINCT bd.id) AS total_berkas,
          AVG(COALESCE(v.skor_verifikasi, pm.skor_mandiri, 0)) AS rata_rata_skor
        FROM kks_indikator i
        LEFT JOIN kks_penilaian_mandiri pm ON pm.indikator_id = i.id AND pm.tahun = i.tahun
        LEFT JOIN kks_bukti_dukung bd ON bd.penilaian_id = pm.id
        LEFT JOIN kks_verifikasi v ON v.penilaian_id = pm.id
        WHERE i.tahun = ?
      `, [tahun]);

      const global = globalStats[0] || {};
      const totalInd = global.total_indikator || 0;
      const totalDiisi = global.total_diisi || 0;
      const totalVerified = global.total_disetujui || 0;
      const avgScore = Math.round((global.rata_rata_skor || 0) * 10) / 10;

      // Hitung persentase keterisian
      const persentaseKeterisian = totalInd > 0 ? Math.round((totalDiisi / totalInd) * 100) : 0;
      const persentaseVerifikasi = totalInd > 0 ? Math.round((totalVerified / totalInd) * 100) : 0;

      // Tentukan Predikat Swasti Saba
      let predikat = 'Belum Memenuhi Syarat';
      if (avgScore >= 90) {
        predikat = 'Potensi Swasti Saba Wistara';
      } else if (avgScore >= 80) {
        predikat = 'Potensi Swasti Saba Wiwerda';
      } else if (avgScore >= 70) {
        predikat = 'Potensi Swasti Saba Padapa';
      }

      res.status(200).json({
        success: true,
        data: {
          periode,
          stats: {
            totalIndikator: totalInd,
            totalDiisi: totalDiisi,
            totalVerifikasi: totalVerified,
            totalBerkas: global.total_berkas || 0,
            persentaseKeterisian,
            persentaseVerifikasi,
            rataRataSkor: avgScore,
            predikat
          },
          tatananSummary: indStats.map(item => ({
            ...item,
            persentase: item.total_indikator > 0 ? Math.round((item.total_diisi / item.total_indikator) * 100) : 0,
            avg_skor: Math.round((item.avg_skor || 0) * 10) / 10
          }))
        }
      });
    } catch (err) {
      console.error('KKS getSummary error:', err);
      res.status(500).json({ success: false, message: 'Gagal memuat ringkasan KKS', error: err.message });
    }
  },

  // 2. Leaderboard Kinerja Upload OPD
  getLeaderboardOpd: async (req, res) => {
    try {
      const tahun = parseInt(req.query.tahun || 2026, 10);

      const [rows] = await pool.query(`
        SELECT 
          COALESCE(i.instansi_pengampu_id, 0) AS instansi_id,
          COALESCE(inst.singkatan, i.instansi_pengampu_nama, 'Lainnya') AS singkatan_opd,
          COALESCE(inst.instansi, i.instansi_pengampu_nama, 'Perangkat Daerah Lainnya') AS nama_opd,
          COUNT(DISTINCT i.id) AS total_indikator,
          COUNT(DISTINCT pm.id) AS total_diisi,
          COUNT(DISTINCT bd.id) AS total_bukti,
          COUNT(DISTINCT CASE WHEN v.status_verifikasi = 'disetujui' THEN pm.id END) AS total_disetujui,
          COUNT(DISTINCT CASE WHEN v.status_verifikasi = 'perlu_perbaikan' THEN pm.id END) AS total_revisi,
          AVG(COALESCE(v.skor_verifikasi, pm.skor_mandiri, 0)) AS avg_skor
        FROM kks_indikator i
        LEFT JOIN master_instansi_daerah inst ON inst.id = i.instansi_pengampu_id
        LEFT JOIN kks_penilaian_mandiri pm ON pm.indikator_id = i.id AND pm.tahun = i.tahun
        LEFT JOIN kks_bukti_dukung bd ON bd.penilaian_id = pm.id
        LEFT JOIN kks_verifikasi v ON v.penilaian_id = pm.id
        WHERE i.tahun = ?
        GROUP BY instansi_id, singkatan_opd, nama_opd
        ORDER BY (COUNT(DISTINCT bd.id) / GREATEST(COUNT(DISTINCT i.id), 1)) DESC, total_indikator DESC
      `, [tahun]);

      const leaderboard = rows.map((r, idx) => {
        const pct = r.total_indikator > 0 ? Math.round((r.total_bukti / r.total_indikator) * 100) : 0;
        return {
          rank: idx + 1,
          instansi_id: r.instansi_id,
          nama_opd: r.nama_opd,
          singkatan_opd: r.singkatan_opd,
          total_indikator: r.total_indikator,
          total_diisi: r.total_diisi,
          total_bukti: r.total_bukti,
          total_disetujui: r.total_disetujui,
          total_revisi: r.total_revisi,
          persentase_upload: Math.min(pct, 100),
          avg_skor: Math.round((r.avg_skor || 0) * 10) / 10
        };
      });

      res.status(200).json({ success: true, data: leaderboard });
    } catch (err) {
      console.error('KKS getLeaderboardOpd error:', err);
      res.status(500).json({ success: false, message: 'Gagal memuat peringkat OPD', error: err.message });
    }
  },

  // 3. Daftar Tatanan
  getTatananList: async (req, res) => {
    try {
      const tahun = parseInt(req.query.tahun || 2026, 10);
      const [rows] = await pool.query(`
        SELECT 
          t.*,
          COUNT(i.id) AS total_indikator
        FROM kks_tatanan t
        LEFT JOIN kks_indikator i ON i.tatanan_id = t.id AND i.tahun = t.tahun
        WHERE t.tahun = ?
        GROUP BY t.id
        ORDER BY t.urutan ASC, t.nomor_tatanan ASC
      `, [tahun]);
      res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error('KKS getTatananList error:', err);
      res.status(500).json({ success: false, message: 'Gagal memuat tatanan', error: err.message });
    }
  },

  // 4. Daftar Indikator Lengkap (dengan kriteria, penilaian mandiri & verifikasi)
  getIndikatorList: async (req, res) => {
    try {
      const tahun = parseInt(req.query.tahun || 2026, 10);
      const { tatanan_id, opd_id, search, filter_status } = req.query;

      let query = `
        SELECT 
          i.*,
          t.nama_tatanan,
          t.nomor_tatanan,
          t.warna_tema AS tatanan_warna,
          pm.id AS penilaian_id,
          pm.skor_mandiri,
          pm.catatan_opd,
          pm.status_pengisian,
          pm.submitted_at,
          v.id AS verifikasi_id,
          v.skor_verifikasi,
          v.status_verifikasi,
          v.catatan_rekomendasi,
          v.verified_at
        FROM kks_indikator i
        JOIN kks_tatanan t ON t.id = i.tatanan_id
        LEFT JOIN kks_penilaian_mandiri pm ON pm.indikator_id = i.id AND pm.tahun = i.tahun
        LEFT JOIN kks_verifikasi v ON v.penilaian_id = pm.id
        WHERE i.tahun = ?
      `;
      const params = [tahun];

      if (tatanan_id) {
        query += ' AND i.tatanan_id = ?';
        params.push(tatanan_id);
      }

      if (opd_id) {
        query += ' AND (i.instansi_pengampu_id = ? OR FIND_IN_SET(?, i.crosscutting_instansi_ids) > 0)';
        params.push(opd_id, opd_id);
      }

      if (search) {
        query += ' AND (i.nama_indikator LIKE ? OR i.definisi_operasional LIKE ? OR i.nomor_indikator LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY t.nomor_tatanan ASC, i.urutan ASC, i.id ASC';

      const [indicators] = await pool.query(query, params);

      if (indicators.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      const indicatorIds = indicators.map(ind => ind.id);
      const penilaianIds = indicators.map(ind => ind.penilaian_id).filter(Boolean);

      // Ambil kriteria skala
      const [kriteriaRows] = await pool.query(
        'SELECT * FROM kks_kriteria_skala WHERE indikator_id IN (?) ORDER BY skor DESC, urutan ASC',
        [indicatorIds]
      );

      // Ambil berkas bukti dukung
      let buktiRows = [];
      if (penilaianIds.length > 0) {
        const [bRows] = await pool.query(
          'SELECT * FROM kks_bukti_dukung WHERE penilaian_id IN (?) ORDER BY id DESC',
          [penilaianIds]
        );
        buktiRows = bRows;
      }

      // Gabungkan kriteria dan berkas ke setiap indikator
      const kriteriaMap = {};
      kriteriaRows.forEach(k => {
        if (!kriteriaMap[k.indikator_id]) kriteriaMap[k.indikator_id] = [];
        kriteriaMap[k.indikator_id].push(k);
      });

      const buktiMap = {};
      buktiRows.forEach(b => {
        if (!buktiMap[b.penilaian_id]) buktiMap[b.penilaian_id] = [];
        buktiMap[b.penilaian_id].push(b);
      });

      const result = indicators.map(ind => ({
        ...ind,
        kriteria_skala: kriteriaMap[ind.id] || [],
        bukti_dukung_list: ind.penilaian_id ? (buktiMap[ind.penilaian_id] || []) : []
      }));

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('KKS getIndikatorList error:', err);
      res.status(500).json({ success: false, message: 'Gagal memuat daftar indikator', error: err.message });
    }
  },

  // 5. Simpan / Update Penilaian Mandiri OPD
  savePenilaian: async (req, res) => {
    try {
      const { tahun, indikator_id, skor_mandiri, catatan_opd, status_pengisian } = req.body;
      const user = req.user || {};
      const instansiId = req.body.instansi_id || user.instansi_id || 2; // fallback Bapperida

      if (!indikator_id || !tahun) {
        return res.status(400).json({ success: false, message: 'Indikator ID dan Tahun wajib diisi!' });
      }

      // Upsert penilaian mandiri
      const [existing] = await pool.query(
        'SELECT id FROM kks_penilaian_mandiri WHERE tahun = ? AND indikator_id = ? AND instansi_id = ?',
        [tahun, indikator_id, instansiId]
      );

      let penilaianId;
      if (existing.length > 0) {
        penilaianId = existing[0].id;
        await pool.query(`
          UPDATE kks_penilaian_mandiri
          SET skor_mandiri = ?, catatan_opd = ?, status_pengisian = ?, submitted_at = NOW(), user_id_pengisi = ?
          WHERE id = ?
        `, [skor_mandiri, catatan_opd || null, status_pengisian || 'siap_verifikasi', user.id || null, penilaianId]);
      } else {
        const [ins] = await pool.query(`
          INSERT INTO kks_penilaian_mandiri (tahun, indikator_id, instansi_id, skor_mandiri, catatan_opd, status_pengisian, submitted_at, user_id_pengisi)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        `, [tahun, indikator_id, instansiId, skor_mandiri, catatan_opd || null, status_pengisian || 'siap_verifikasi', user.id || null]);
        penilaianId = ins.insertId;
      }

      res.status(200).json({
        success: true,
        message: 'Penilaian mandiri berhasil disimpan!',
        data: { penilaian_id: penilaianId }
      });
    } catch (err) {
      console.error('KKS savePenilaian error:', err);
      res.status(500).json({ success: false, message: 'Gagal menyimpan penilaian mandiri', error: err.message });
    }
  },

  // 6. Upload Bukti Dukung (File atau Link) - Auto-Sync Perpustakaan SAMP & Auto-Tagging Tematik KKS
  uploadBuktiDukung: (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      try {
        const { penilaian_id, tipe_sumber, url_external, nama_berkas, keterangan, tahun_dokumen } = req.body;
        const user = req.user || {};
        const tahunDok = parseInt(tahun_dokumen, 10) || 2025;

        if (!penilaian_id) {
          return res.status(400).json({ success: false, message: 'Penilaian ID wajib disertakan!' });
        }

        let filePath = null;
        let ukuranFile = null;
        let ekstensi = null;
        let finalNama = nama_berkas;
        let hashHex = null;
        let docId = null;

        if (req.file) {
          filePath = '/uploads/' + req.file.filename;
          ukuranFile = req.file.size;
          ekstensi = 'pdf';
          if (!finalNama) finalNama = req.file.originalname;

          const absolutePath = path.join(__dirname, '../../../../uploads/', req.file.filename);
          const fileBuffer = fs.readFileSync(absolutePath);
          hashHex = crypto.createHash('md5').update(fileBuffer).digest('hex');

          // Cek apakah file sudah pernah diunggah di tabel dokumen_upload (Perpustakaan SAMP)
          const [duplicatePerpus] = await pool.query(
            'SELECT id, nama_file, path FROM dokumen_upload WHERE hash = ? AND is_deleted = 0 LIMIT 1',
            [hashHex]
          );

          if (duplicatePerpus.length > 0) {
            // Berkas sudah ada di perpustakaan SAMP: hemat storage, hapus file baru yang kembar
            docId = duplicatePerpus[0].id;
            filePath = duplicatePerpus[0].path;
            if (fs.existsSync(absolutePath)) {
              try { fs.unlinkSync(absolutePath); } catch (e) { /* ignore */ }
            }

            // Pastikan terdaftar di Ruang Tematik KKS (ID 5)
            await pool.query(
              'INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, 5, 0)',
              [docId]
            );
          } else {
            // Berkas baru: Daftarkan otomatis ke dokumen_upload (Perpustakaan SAMP)
            const [insDoc] = await pool.query(`
              INSERT INTO dokumen_upload (
                nama_file, nama_asli_unggah, path, ukuran, hash, jenis_dokumen_id, uploaded_by, is_private
              ) VALUES (?, ?, ?, ?, ?, 9, ?, 0)
            `, [
              finalNama,
              req.file.originalname,
              filePath,
              ukuranFile,
              hashHex,
              user.id || null
            ]);
            docId = insDoc.insertId;

            // Catat history perpustakaan
            try {
              await pool.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [docId, user.id || null, 'upload', 'File diunggah via Instrumen Penilaian KKS']
              );
            } catch (hErr) { /* ignore */ }

            // Auto-tagging ke Ruang Tematik KKS (ID 5)
            await pool.query(
              'INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, 5, 0)',
              [docId]
            );
          }

          // Cek apakah dokumen ini sudah terpasang pada indikator & tahun penilaian ini
          const [duplicateKks] = await pool.query(
            'SELECT id FROM kks_bukti_dukung WHERE penilaian_id = ? AND tahun_dokumen = ? AND (hash = ? OR (dokumen_id IS NOT NULL AND dokumen_id = ?)) LIMIT 1',
            [penilaian_id, tahunDok, hashHex, docId]
          );

          if (duplicateKks.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'Dokumen ini sudah terlampir pada indikator dan tahun evaluasi yang dipilih.'
            });
          }
        } else if (tipe_sumber === 'link_url') {
          if (!url_external) {
            return res.status(400).json({ success: false, message: 'URL/Link tautan wajib diisi!' });
          }
          if (!finalNama) finalNama = 'Tautan Aplikasi Eksternal';
        } else {
          return res.status(400).json({ success: false, message: 'Harap lampirkan file PDF atau tautan link!' });
        }

        const [result] = await pool.query(`
          INSERT INTO kks_bukti_dukung (
            penilaian_id, tipe_sumber, tahun_dokumen, nama_berkas, file_path,
            url_external, ukuran_file, ekstensi, hash, dokumen_id, keterangan, uploaded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          penilaian_id,
          tipe_sumber || (req.file ? 'file_upload' : 'link_url'),
          tahunDok,
          finalNama,
          filePath,
          url_external || null,
          ukuranFile,
          ekstensi,
          hashHex,
          docId,
          keterangan || null,
          user.id || null
        ]);

        res.status(200).json({
          success: true,
          message: 'Bukti dukung berhasil disimpan dan disinkronkan ke Ruang Tematik KKS SAMP!',
          data: {
            id: result.insertId,
            penilaian_id,
            tahun_dokumen: tahunDok,
            nama_berkas: finalNama,
            file_path: filePath,
            dokumen_id: docId,
            url_external,
            hash: hashHex
          }
        });
      } catch (uploadErr) {
        console.error('KKS uploadBuktiDukung error:', uploadErr);
        res.status(500).json({ success: false, message: 'Gagal mengunggah bukti dukung', error: uploadErr.message });
      }
    });
  },

  // 6b. Ambil Daftar Dokumen Perpustakaan SAMP (Filter KKS atau Semua)
  getPustakaKks: async (req, res) => {
    try {
      const search = req.query.search ? req.query.search.trim() : '';
      const filter = req.query.filter || 'kks'; // 'kks' | 'all'
      const page = Math.max(1, parseInt(req.query.page || 1, 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20, 10)));
      const offset = (page - 1) * limit;

      let whereClauses = ['d.is_deleted = 0'];
      const params = [];

      if (filter === 'kks') {
        whereClauses.push('EXISTS (SELECT 1 FROM dokumen_tematik dt_kks WHERE dt_kks.dokumen_id = d.id AND dt_kks.tematik_id = 5)');
      }

      if (search) {
        whereClauses.push('(d.nama_file LIKE ? OR d.nama_asli_unggah LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Hitung total
      const [countRows] = await pool.query(`
        SELECT COUNT(DISTINCT d.id) AS total
        FROM dokumen_upload d
        ${whereStr}
      `, params);
      const total = countRows[0]?.total || 0;

      // Ambil rows dokumen
      const [rows] = await pool.query(`
        SELECT 
          d.id,
          d.nama_file,
          d.nama_asli_unggah,
          d.path,
          d.ukuran,
          d.hash,
          d.uploaded_at,
          d.uploaded_by,
          COALESCE(pp.nama_lengkap, u.username, 'Sistem') AS uploader_nama,
          EXISTS (
            SELECT 1 FROM dokumen_tematik dt_kks 
            WHERE dt_kks.dokumen_id = d.id AND dt_kks.tematik_id = 5
          ) AS is_kks,
          (
            SELECT GROUP_CONCAT(DISTINCT mt.nama SEPARATOR ', ')
            FROM dokumen_tematik dt
            JOIN master_tematik mt ON mt.id = dt.tematik_id
            WHERE dt.dokumen_id = d.id
          ) AS tematik_names
        FROM dokumen_upload d
        LEFT JOIN users u ON u.id = d.uploaded_by
        LEFT JOIN profil_pegawai pp ON pp.id = u.profil_pegawai_id
        ${whereStr}
        ORDER BY d.uploaded_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      console.error('KKS getPustakaKks error:', err);
      res.status(500).json({ success: false, message: 'Gagal memuat dokumen perpustakaan', error: err.message });
    }
  },

  // 6c. Tautkan Dokumen Perpustakaan SAMP ke Bukti Dukung Indikator KKS
  linkLibraryDoc: async (req, res) => {
    try {
      const { penilaian_id, dokumen_id, tahun_dokumen, keterangan } = req.body;
      const user = req.user || {};
      const tahunDok = parseInt(tahun_dokumen, 10) || 2025;

      if (!penilaian_id || !dokumen_id) {
        return res.status(400).json({ success: false, message: 'Penilaian ID dan Dokumen ID wajib disertakan!' });
      }

      // Ambil file dari perpustakaan
      const [docRows] = await pool.query(
        'SELECT * FROM dokumen_upload WHERE id = ? AND is_deleted = 0',
        [dokumen_id]
      );

      if (docRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Dokumen perpustakaan tidak ditemukan atau telah dihapus' });
      }

      const doc = docRows[0];

      // Auto-tagging ke Ruang Tematik KKS (ID 5)
      await pool.query(
        'INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, 5, 0)',
        [doc.id]
      );

      // Cek apakah sudah terlampir pada indikator & tahun ini
      const [existingBukti] = await pool.query(
        'SELECT id FROM kks_bukti_dukung WHERE penilaian_id = ? AND tahun_dokumen = ? AND (dokumen_id = ? OR hash = ? OR file_path = ?)',
        [penilaian_id, tahunDok, doc.id, doc.hash || '', doc.path]
      );

      if (existingBukti.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dokumen ini sudah terlampir sebagai bukti dukung pada indikator ini.'
        });
      }

      // Tautkan ke kks_bukti_dukung
      const [ins] = await pool.query(`
        INSERT INTO kks_bukti_dukung (
          penilaian_id, tipe_sumber, tahun_dokumen, nama_berkas, file_path,
          ukuran_file, ekstensi, hash, dokumen_id, keterangan, uploaded_by
        ) VALUES (?, 'file_upload', ?, ?, ?, ?, 'pdf', ?, ?, ?, ?)
      `, [
        penilaian_id,
        tahunDok,
        doc.nama_file,
        doc.path,
        doc.ukuran,
        doc.hash,
        doc.id,
        keterangan || null,
        user.id || null
      ]);

      res.status(200).json({
        success: true,
        message: 'Dokumen perpustakaan berhasil ditautkan sebagai bukti dukung KKS!',
        data: {
          id: ins.insertId,
          penilaian_id,
          dokumen_id: doc.id,
          nama_berkas: doc.nama_file,
          file_path: doc.path,
          tahun_dokumen: tahunDok
        }
      });
    } catch (err) {
      console.error('KKS linkLibraryDoc error:', err);
      res.status(500).json({ success: false, message: 'Gagal menautkan dokumen perpustakaan', error: err.message });
    }
  },

  // 7. Hapus Bukti Dukung
  deleteBuktiDukung: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM kks_bukti_dukung WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Bukti dukung tidak ditemukan' });
      }

      await pool.query('DELETE FROM kks_bukti_dukung WHERE id = ?', [id]);
      res.status(200).json({ success: true, message: 'Bukti dukung berhasil dihapus' });
    } catch (err) {
      console.error('KKS deleteBuktiDukung error:', err);
      res.status(500).json({ success: false, message: 'Gagal menghapus bukti dukung', error: err.message });
    }
  },

  // 8. Verifikasi Penilaian (Tim Pembina / Bapperida)
  saveVerifikasi: async (req, res) => {
    try {
      const { penilaian_id, skor_verifikasi, status_verifikasi, catatan_rekomendasi } = req.body;
      const user = req.user || {};

      if (!penilaian_id) {
        return res.status(400).json({ success: false, message: 'Penilaian ID wajib diisi!' });
      }

      const [existing] = await pool.query('SELECT id FROM kks_verifikasi WHERE penilaian_id = ?', [penilaian_id]);

      if (existing.length > 0) {
        await pool.query(`
          UPDATE kks_verifikasi
          SET skor_verifikasi = ?, status_verifikasi = ?, catatan_rekomendasi = ?, verifikator_id = ?, verified_at = NOW()
          WHERE penilaian_id = ?
        `, [skor_verifikasi, status_verifikasi || 'disetujui', catatan_rekomendasi || null, user.id || null, penilaian_id]);
      } else {
        await pool.query(`
          INSERT INTO kks_verifikasi (penilaian_id, skor_verifikasi, status_verifikasi, catatan_rekomendasi, verifikator_id, verified_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [penilaian_id, skor_verifikasi, status_verifikasi || 'disetujui', catatan_rekomendasi || null, user.id || null]);
      }

      res.status(200).json({ success: true, message: 'Hasil verifikasi berhasil disimpan!' });
    } catch (err) {
      console.error('KKS saveVerifikasi error:', err);
      res.status(500).json({ success: false, message: 'Gagal menyimpan verifikasi', error: err.message });
    }
  },

  // 9. Kelola Periode Tahun
  getPeriodeList: async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM kks_periode ORDER BY tahun DESC');
      res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error('KKS getPeriodeList error:', err);
      res.status(500).json({ success: false, message: 'Gagal memuat periode', error: err.message });
    }
  },

  // 10. Fitur Kloning Master Instrumen ke Tahun Baru (Copy dari Tahun Sebelumnya)
  cloneYear: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { tahun_asal, tahun_tujuan, nama_periode } = req.body;
      if (!tahun_asal || !tahun_tujuan) {
        return res.status(400).json({ success: false, message: 'Tahun asal dan target wajib ditentukan!' });
      }

      if (Number(tahun_asal) === Number(tahun_tujuan)) {
        return res.status(400).json({ success: false, message: 'Tahun tujuan harus berbeda dari tahun asal!' });
      }

      // 1. Buat periode tahun target
      await connection.query(`
        INSERT INTO kks_periode (tahun, nama_periode, status, target_predikat, keterangan)
        VALUES (?, ?, 'draft', 'Swasti Saba Wistara', ?)
        ON DUPLICATE KEY UPDATE nama_periode = VALUES(nama_periode)
      `, [tahun_tujuan, nama_periode || `Penilaian KKS Tahun ${tahun_tujuan}`, `Disalin dari instrumen tahun ${tahun_asal}`]);

      // 2. Ambil seluruh tatanan dari tahun asal
      const [tatananAsal] = await connection.query(
        'SELECT * FROM kks_tatanan WHERE tahun = ?',
        [tahun_asal]
      );

      if (tatananAsal.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: `Tidak ada data tatanan pada tahun ${tahun_asal}` });
      }

      // Hapus data instrumen target jika sudah pernah ada
      await connection.query('DELETE FROM kks_tatanan WHERE tahun = ?', [tahun_tujuan]);

      const tatananIdMap = {}; // old_id -> new_id

      for (const t of tatananAsal) {
        const [insT] = await connection.query(`
          INSERT INTO kks_tatanan (tahun, nomor_tatanan, kode_tatanan, nama_tatanan, deskripsi, bobot, icon, warna_tema, urutan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tahun_tujuan, t.nomor_tatanan, t.kode_tatanan, t.nama_tatanan, t.deskripsi, t.bobot, t.icon, t.warna_tema, t.urutan]);
        tatananIdMap[t.id] = insT.insertId;
      }

      // 3. Ambil seluruh indikator dari tahun asal
      const [indAsal] = await connection.query(
        'SELECT * FROM kks_indikator WHERE tahun = ?',
        [tahun_asal]
      );

      let totalClonedInd = 0;
      let totalClonedKriteria = 0;

      for (const ind of indAsal) {
        const newTatananId = tatananIdMap[ind.tatanan_id];
        if (!newTatananId) continue;

        const [insInd] = await connection.query(`
          INSERT INTO kks_indikator (
            tahun, tatanan_id, nomor_indikator, nama_indikator,
            definisi_operasional, sumber_data, bukti_dukung_dibutuhkan,
            instansi_pengampu_id, instansi_pengampu_nama, crosscutting_instansi_ids,
            catatan_khusus, urutan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          tahun_tujuan, newTatananId, ind.nomor_indikator, ind.nama_indikator,
          ind.definisi_operasional, ind.sumber_data, ind.bukti_dukung_dibutuhkan,
          ind.instansi_pengampu_id, ind.instansi_pengampu_nama, ind.crosscutting_instansi_ids,
          ind.catatan_khusus, ind.urutan
        ]);

        const newIndikatorId = insInd.insertId;
        totalClonedInd++;

        // Salin kriteria skala
        const [kriteriaAsal] = await connection.query(
          'SELECT * FROM kks_kriteria_skala WHERE indikator_id = ?',
          [ind.id]
        );

        for (const k of kriteriaAsal) {
          await connection.query(`
            INSERT INTO kks_kriteria_skala (indikator_id, skor, kriteria, urutan)
            VALUES (?, ?, ?, ?)
          `, [newIndikatorId, k.skor, k.kriteria, k.urutan]);
          totalClonedKriteria++;
        }
      }

      await connection.commit();
      res.status(200).json({
        success: true,
        message: `Berhasil menyalin ${totalClonedInd} indikator dan ${totalClonedKriteria} butir kriteria dari tahun ${tahun_asal} ke ${tahun_tujuan}!`,
        data: { tahun_tujuan, totalIndikator: totalClonedInd }
      });
    } catch (err) {
      await connection.rollback();
      console.error('KKS cloneYear error:', err);
      res.status(500).json({ success: false, message: 'Gagal menduplikasi instrumen tahun', error: err.message });
    } finally {
      connection.release();
    }
  },

  // 11. Superadmin Update Master Indikator
  updateIndikator: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nomor_indikator,
        nama_indikator, definisi_operasional, sumber_data,
        bukti_dukung_dibutuhkan, instansi_pengampu_id, instansi_pengampu_nama,
        crosscutting_instansi_ids, catatan_khusus, kriteria_skala
      } = req.body;

      await pool.query(`
        UPDATE kks_indikator
        SET nomor_indikator = COALESCE(?, nomor_indikator),
            nama_indikator = ?, definisi_operasional = ?, sumber_data = ?,
            bukti_dukung_dibutuhkan = ?, instansi_pengampu_id = ?, instansi_pengampu_nama = ?,
            crosscutting_instansi_ids = ?, catatan_khusus = ?
        WHERE id = ?
      `, [
        nomor_indikator || null,
        nama_indikator, definisi_operasional, sumber_data,
        bukti_dukung_dibutuhkan, instansi_pengampu_id || null, instansi_pengampu_nama || null,
        crosscutting_instansi_ids || null, catatan_khusus || null, id
      ]);

      if (Array.isArray(kriteria_skala)) {
        await pool.query('DELETE FROM kks_kriteria_skala WHERE indikator_id = ?', [id]);
        for (let idx = 0; idx < kriteria_skala.length; idx++) {
          const k = kriteria_skala[idx];
          if (k && k.skor !== undefined && k.kriteria && k.kriteria.trim()) {
            await pool.query(
              'INSERT INTO kks_kriteria_skala (indikator_id, skor, kriteria, urutan) VALUES (?, ?, ?, ?)',
              [id, parseInt(k.skor, 10), k.kriteria.trim(), idx + 1]
            );
          }
        }
      }

      res.status(200).json({ success: true, message: 'Indikator dan panduan skala berhasil diperbarui!' });
    } catch (err) {
      console.error('KKS updateIndikator error:', err);
      res.status(500).json({ success: false, message: 'Gagal memperbarui indikator', error: err.message });
    }
  },

  // 12. Superadmin Tambah Indikator Baru
  createIndikator: async (req, res) => {
    try {
      const {
        tahun, tatanan_id, nomor_indikator, nama_indikator,
        definisi_operasional, sumber_data, bukti_dukung_dibutuhkan,
        instansi_pengampu_id, instansi_pengampu_nama, crosscutting_instansi_ids
      } = req.body;

      if (!tahun || !tatanan_id || !nama_indikator) {
        return res.status(400).json({ success: false, message: 'Tahun, Tatanan, dan Nama Indikator wajib diisi!' });
      }

      const [ins] = await pool.query(`
        INSERT INTO kks_indikator (
          tahun, tatanan_id, nomor_indikator, nama_indikator,
          definisi_operasional, sumber_data, bukti_dukung_dibutuhkan,
          instansi_pengampu_id, instansi_pengampu_nama, crosscutting_instansi_ids, urutan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 99)
      `, [
        tahun, tatanan_id, nomor_indikator || '+', nama_indikator,
        definisi_operasional || null, sumber_data || null, bukti_dukung_dibutuhkan || null,
        instansi_pengampu_id || null, instansi_pengampu_nama || null,
        crosscutting_instansi_ids || null
      ]);

      const newId = ins.insertId;
      await pool.query(`
        INSERT INTO kks_kriteria_skala (indikator_id, skor, kriteria, urutan)
        VALUES 
          (?, 100, 'Memenuhi seluruh standar kriteria dan melampirkan bukti lengkap', 1),
          (?, 50, 'Memenuhi sebagian standar kriteria atau bukti belum lengkap', 2),
          (?, 0, 'Tidak memenuhi standar kriteria atau tidak melampirkan bukti', 3)
      `, [newId, newId, newId]);

      res.status(200).json({ success: true, message: 'Indikator baru berhasil ditambahkan!', data: { id: newId } });
    } catch (err) {
      console.error('KKS createIndikator error:', err);
      res.status(500).json({ success: false, message: 'Gagal membuat indikator baru', error: err.message });
    }
  },

  // 13. Superadmin Hapus Indikator
  deleteIndikator: async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM kks_indikator WHERE id = ?', [id]);
      res.status(200).json({ success: true, message: 'Indikator berhasil dihapus' });
    } catch (err) {
      console.error('KKS deleteIndikator error:', err);
      res.status(500).json({ success: false, message: 'Gagal menghapus indikator', error: err.message });
    }
  },

  // 14. Superadmin Tambah Tatanan Baru
  createTatanan: async (req, res) => {
    try {
      const { tahun, nomor_tatanan, kode_tatanan, nama_tatanan, deskripsi, bobot, icon, warna_tema, urutan } = req.body;
      if (!tahun || nomor_tatanan === undefined || !nama_tatanan) {
        return res.status(400).json({ success: false, message: 'Tahun, nomor tatanan, dan nama tatanan wajib diisi!' });
      }
      const kode = kode_tatanan || `tatanan_${nomor_tatanan}`;
      const [ins] = await pool.query(`
        INSERT INTO kks_tatanan (tahun, nomor_tatanan, kode_tatanan, nama_tatanan, deskripsi, bobot, icon, warna_tema, urutan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        tahun,
        nomor_tatanan,
        kode,
        nama_tatanan,
        deskripsi || null,
        bobot || 0,
        icon || 'Layers',
        warna_tema || 'emerald',
        urutan || nomor_tatanan
      ]);
      res.status(200).json({ success: true, message: 'Tatanan baru berhasil ditambahkan!', data: { id: ins.insertId } });
    } catch (err) {
      console.error('KKS createTatanan error:', err);
      res.status(500).json({ success: false, message: 'Gagal membuat tatanan baru', error: err.message });
    }
  },

  // 15. Superadmin Ubah Tatanan
  updateTatanan: async (req, res) => {
    try {
      const { id } = req.params;
      const { nomor_tatanan, nama_tatanan, deskripsi, bobot, icon, warna_tema, urutan } = req.body;
      await pool.query(`
        UPDATE kks_tatanan
        SET nomor_tatanan = COALESCE(?, nomor_tatanan),
            nama_tatanan = COALESCE(?, nama_tatanan),
            deskripsi = ?,
            bobot = COALESCE(?, bobot),
            icon = COALESCE(?, icon),
            warna_tema = COALESCE(?, warna_tema),
            urutan = COALESCE(?, urutan)
        WHERE id = ?
      `, [nomor_tatanan, nama_tatanan, deskripsi || null, bobot, icon, warna_tema, urutan, id]);
      res.status(200).json({ success: true, message: 'Tatanan berhasil diperbarui!' });
    } catch (err) {
      console.error('KKS updateTatanan error:', err);
      res.status(500).json({ success: false, message: 'Gagal memperbarui tatanan', error: err.message });
    }
  },

  // 16. Superadmin Hapus Tatanan
  deleteTatanan: async (req, res) => {
    try {
      const { id } = req.params;
      const [inds] = await pool.query('SELECT COUNT(*) as cnt FROM kks_indikator WHERE tatanan_id = ?', [id]);
      if (inds[0].cnt > 0) {
        return res.status(400).json({
          success: false,
          message: `Tidak dapat menghapus tatanan ini karena masih memiliki ${inds[0].cnt} indikator. Harap hapus atau pindahkan indikatornya terlebih dahulu.`
        });
      }
      await pool.query('DELETE FROM kks_tatanan WHERE id = ?', [id]);
      res.status(200).json({ success: true, message: 'Tatanan berhasil dihapus' });
    } catch (err) {
      console.error('KKS deleteTatanan error:', err);
      res.status(500).json({ success: false, message: 'Gagal menghapus tatanan', error: err.message });
    }
  }
};

module.exports = kksController;
