const pool = require('../../../config/db');
const auditService = require('../../../utils/auditService');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure Multer for document upload
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
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.7z', '.csv', '.txt'];
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF, Word, Excel, dan Arsip (.zip, .rar, .7z) yang diperbolehkan!'));
        }
    }
}).single('file');

// Get all tematik
const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_tematik ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get tematik by ID
const getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_tematik WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create tematik
const create = async (req, res) => {
  try {
    const { nama } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }
    const [result] = await pool.query('INSERT INTO master_tematik (nama) VALUES (?)', [nama]);
    const newId = result.insertId;

    // Seed default mandatory documents for newly created tematik
    const defaultSlots = [
      { kode: 'sk_tim', judul: 'SK Tim Koordinasi / Pokja Tematik', desc: 'Surat Keputusan Bupati / Kepala Daerah pembentukan Tim Koordinasi Pokja Tematik.' },
      { kode: 'rad', judul: 'Rencana Aksi Daerah (RAD) / Grand Design', desc: 'Dokumen master plan / rencana aksi lintas sektor pencapaian target tematik.' },
      { kode: 'sop', judul: 'SOP & Pedoman Teknis Pelaksanaan', desc: 'Standar operasional prosedur penanganan, tata laksana, dan intervensi program.' },
      { kode: 'evaluasi', judul: 'Laporan Evaluasi & Monev Berkala', desc: 'Laporan capaian semesteran/tahunan, evaluasi intervensi, dan rekomendasi tindak lanjut.' },
      { kode: 'regulasi', judul: 'Regulasi Daerah / Perbup Pendukung', desc: 'Peraturan Bupati / Daerah yang menjadi payung hukum pelaksanaan tematik.' }
    ];
    for (const slot of defaultSlots) {
      await pool.query(
        'INSERT INTO tematik_dokumen_wajib (tematik_id, kode_dokumen, judul_dokumen, deskripsi) VALUES (?, ?, ?, ?)',
        [newId, slot.kode, slot.judul, slot.desc]
      );
    }

    res.status(201).json({ success: true, data: { id: newId, nama } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update tematik
const update = async (req, res) => {
  try {
    const { nama } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }
    const [result] = await pool.query('UPDATE master_tematik SET nama = ? WHERE id = ?', [nama, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: { id: parseInt(req.params.id), nama } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete tematik
const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM master_tematik WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    // Clean up mandatory doc slots
    await pool.query('DELETE FROM tematik_dokumen_wajib WHERE tematik_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// TEMATIK HUB AGGREGATED DATA
// =========================================================================
const getHubData = async (req, res) => {
  try {
    const tematikId = parseInt(req.params.id);
    if (!tematikId) {
      return res.status(400).json({ success: false, message: 'ID Tematik tidak valid' });
    }

    // 1. Tematik Info
    const [tRows] = await pool.query('SELECT * FROM master_tematik WHERE id = ?', [tematikId]);
    if (tRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tematik tidak ditemukan' });
    }
    const tematik = tRows[0];

    // 2. Dokumen Wajib (Highlighted Cards)
    let dokumenWajib = [];
    try {
      const [dwRows] = await pool.query(`
        SELECT tdw.*, 
               du.nama_file as library_file_name, 
               du.ukuran as file_size, 
               du.uploaded_at as doc_uploaded_at,
               u.username as updater_username, 
               pp.nama_lengkap as updater_name
        FROM tematik_dokumen_wajib tdw
        LEFT JOIN dokumen_upload du ON tdw.dokumen_id = du.id
        LEFT JOIN users u ON tdw.updated_by = u.id
        LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
        WHERE tdw.tematik_id = ?
        ORDER BY tdw.id ASC
      `, [tematikId]);
      dokumenWajib = dwRows;
    } catch (e) {
      console.warn('tematikHub: failed to fetch dokumenWajib:', e.message);
    }

    // 3. Kegiatan Manajemen Terkait
    let kegiatan = [];
    try {
      const [kegRows] = await pool.query(`
        SELECT k.id, k.tanggal, k.tanggal_akhir, k.nama_kegiatan, k.instansi_penyelenggara,
               k.bidang_ids, k.kelengkapan, k.keterangan, k.sesi,
               k.surat_undangan_masuk_id, du_sum.nama_file as surat_masuk_nama, du_sum.path as surat_masuk_path,
               k.surat_undangan_keluar_id, du_suk.nama_file as surat_keluar_nama, du_suk.path as surat_keluar_path,
               k.bahan_desk_id, du_bd.nama_file as bahan_desk_nama, du_bd.path as bahan_desk_path,
               k.paparan_id, du_pp.nama_file as paparan_nama, du_pp.path as paparan_path,
               k.petugas_ids,
               n.id as notulen_id, n.nomor_notulen
        FROM kegiatan_manajemen k
        LEFT JOIN dokumen_upload du_sum ON k.surat_undangan_masuk_id = du_sum.id
        LEFT JOIN dokumen_upload du_suk ON k.surat_undangan_keluar_id = du_suk.id
        LEFT JOIN dokumen_upload du_bd ON k.bahan_desk_id = du_bd.id
        LEFT JOIN dokumen_upload du_pp ON k.paparan_id = du_pp.id
        LEFT JOIN notulen n ON n.kegiatan_id = k.id AND n.is_deleted = 0
        WHERE k.is_deleted = 0 
          AND (FIND_IN_SET(?, k.tematik_ids) > 0 OR k.tematik_ids = ?)
        ORDER BY k.tanggal DESC
        LIMIT 100
      `, [tematikId, String(tematikId)]);
      kegiatan = kegRows;
    } catch (e) {
      try {
        const [kegRows] = await pool.query(`
          SELECT k.id, k.tanggal, k.tanggal_akhir, k.nama_kegiatan, k.instansi_penyelenggara,
                 k.bidang_ids, k.kelengkapan, k.keterangan, k.sesi,
                 k.surat_undangan_masuk_id, du_sum.nama_file as surat_masuk_nama, du_sum.path as surat_masuk_path,
                 k.surat_undangan_keluar_id, du_suk.nama_file as surat_keluar_nama, du_suk.path as surat_keluar_path,
                 k.bahan_desk_id, du_bd.nama_file as bahan_desk_nama, du_bd.path as bahan_desk_path,
                 k.paparan_id, du_pp.nama_file as paparan_nama, du_pp.path as paparan_path,
                 k.petugas_ids,
                 NULL as notulen_id, NULL as nomor_notulen
          FROM kegiatan_manajemen k
          LEFT JOIN dokumen_upload du_sum ON k.surat_undangan_masuk_id = du_sum.id
          LEFT JOIN dokumen_upload du_suk ON k.surat_undangan_keluar_id = du_suk.id
          LEFT JOIN dokumen_upload du_bd ON k.bahan_desk_id = du_bd.id
          LEFT JOIN dokumen_upload du_pp ON k.paparan_id = du_pp.id
          WHERE k.is_deleted = 0 
            AND (FIND_IN_SET(?, k.tematik_ids) > 0 OR k.tematik_ids = ?)
          ORDER BY k.tanggal DESC
          LIMIT 100
        `, [tematikId, String(tematikId)]);
        kegiatan = kegRows;
      } catch (err2) {
        console.warn('tematikHub: failed to fetch kegiatan:', err2.message);
      }
    }

    // 4. Dokumen Perpustakaan Terkait (dokumen_tematik & dokumen_upload)
    let dokumen = [];
    try {
      const [docRows] = await pool.query(`
        SELECT DISTINCT du.id, du.nama_file, du.nama_asli_unggah, du.path, du.ukuran, du.uploaded_at,
               mjd.nama as jenis_dokumen, du.is_private, 
               u.username as uploader_username, pp.nama_lengkap as uploader_name
        FROM dokumen_tematik dt
        JOIN dokumen_upload du ON dt.dokumen_id = du.id
        LEFT JOIN master_jenis_dokumen mjd ON du.jenis_dokumen_id = mjd.id
        LEFT JOIN users u ON du.uploaded_by = u.id
        LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
        WHERE dt.tematik_id = ? AND du.is_deleted = 0
        ORDER BY du.uploaded_at DESC
        LIMIT 100
      `, [tematikId]);
      dokumen = docRows;
    } catch (e) {
      console.warn('tematikHub: failed to fetch dokumen:', e.message);
    }

    // 5. Surat Terkait (baik dari kegiatan atau nama perihal yang cocok)
    let surat = [];
    try {
      const [suratRows] = await pool.query(`
        SELECT DISTINCT s.id, s.nomor_surat, s.perihal, s.asal_surat, s.tujuan_surat, s.tanggal_surat,
               s.tipe_surat, s.approval_status, du.path as dokumen_path, du.nama_file as dokumen_nama
        FROM surat s
        LEFT JOIN dokumen_upload du ON s.dokumen_id = du.id
        WHERE s.is_deleted = 0 
          AND (
            s.perihal LIKE ? 
            OR s.id IN (
              SELECT DISTINCT k.surat_undangan_masuk_id FROM kegiatan_manajemen k 
              WHERE (FIND_IN_SET(?, k.tematik_ids) > 0) AND k.surat_undangan_masuk_id IS NOT NULL
              UNION
              SELECT DISTINCT k.surat_undangan_keluar_id FROM kegiatan_manajemen k 
              WHERE (FIND_IN_SET(?, k.tematik_ids) > 0) AND k.surat_undangan_keluar_id IS NOT NULL
            )
          )
        ORDER BY s.tanggal_surat DESC
        LIMIT 50
      `, [`%${tematik.nama}%`, tematikId, tematikId]);
      surat = suratRows;
    } catch (e) {
      console.warn('tematikHub: failed to fetch surat:', e.message);
    }

    // 6. Perangkat Daerah (OPD) Terkait (dari kegiatan_manajemen & master_instansi_daerah)
    // Safe aggregation avoiding SQL ONLY_FULL_GROUP_BY issues
    let opdRows = [];
    try {
      const [kegiatanOpd] = await pool.query(`
        SELECT 
          k.instansi_penyelenggara,
          COUNT(k.id) as total_kegiatan,
          MAX(k.tanggal) as kegiatan_terakhir
        FROM kegiatan_manajemen k
        WHERE k.is_deleted = 0 
          AND (FIND_IN_SET(?, k.tematik_ids) > 0 OR k.tematik_ids = ?)
          AND k.instansi_penyelenggara IS NOT NULL 
          AND TRIM(k.instansi_penyelenggara) != ''
        GROUP BY k.instansi_penyelenggara
        ORDER BY total_kegiatan DESC
      `, [tematikId, String(tematikId)]);

      if (kegiatanOpd.length > 0) {
        let masterInstansi = [];
        try {
          const [mInst] = await pool.query('SELECT id, instansi, singkatan FROM master_instansi_daerah');
          masterInstansi = mInst;
        } catch (_) {}

        opdRows = kegiatanOpd.map(item => {
          const rawName = (item.instansi_penyelenggara || '').trim();
          const cleanName = rawName.toLowerCase();
          const matched = masterInstansi.find(m => 
            (m.instansi && m.instansi.trim().toLowerCase() === cleanName) ||
            (m.singkatan && m.singkatan.trim().toLowerCase() === cleanName)
          );
          return {
            instansi_id: matched ? matched.id : 0,
            nama_opd: matched ? matched.instansi : rawName,
            singkatan_opd: matched ? (matched.singkatan || '') : '',
            total_kegiatan: Number(item.total_kegiatan || 0),
            kegiatan_terakhir: item.kegiatan_terakhir
          };
        });
      }
    } catch (e) {
      console.warn('tematikHub: failed to fetch opdRows:', e.message);
    }

    // 7. Indikator & Data Makro Terkait
    let dataMakro = [];
    try {
      const [dmRows] = await pool.query(`
        SELECT dm.id, dm.kode, dm.nama_data, dm.sumber_data, ms.satuan,
               (
                 SELECT dmn.nilai FROM data_makro_nilai dmn 
                 WHERE dmn.data_makro_id = dm.id ORDER BY dmn.tahun DESC LIMIT 1
               ) as nilai_terakhir,
               (
                 SELECT dmn.tahun FROM data_makro_nilai dmn 
                 WHERE dmn.data_makro_id = dm.id ORDER BY dmn.tahun DESC LIMIT 1
               ) as tahun_terakhir
        FROM data_makro dm
        LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
        WHERE dm.tematik_id = ? AND dm.is_active = 1
        ORDER BY dm.urutan ASC, dm.id ASC
      `, [tematikId]);
      dataMakro = dmRows;
    } catch (e) {
      console.warn('tematikHub: failed to fetch dataMakro:', e.message);
    }

    // 8. Aplikasi & Link Eksternal Terkait
    let aplikasiExternal = [];
    try {
      try {
        const [maeRows] = await pool.query(`
          SELECT mae.id, mae.nama_aplikasi, mae.url, mae.pembuat, mae.sumber, mae.keterangan, 
                 COALESCE(mtl.nama, '') as tipe_link
          FROM master_aplikasi_external mae
          LEFT JOIN master_tipe_link mtl ON mae.tipe_link_id = mtl.id
          WHERE (mae.deleted_at IS NULL)
            AND (FIND_IN_SET(?, mae.tematik_ids) > 0 OR mae.tagging LIKE ?)
          ORDER BY mae.urutan ASC
        `, [tematikId, `%${tematik.nama}%`]);
        aplikasiExternal = maeRows;
      } catch (_) {
        const [maeRows] = await pool.query(`
          SELECT mae.id, mae.nama_aplikasi, mae.url, mae.pembuat, mae.sumber, mae.keterangan, 
                 '' as tipe_link
          FROM master_aplikasi_external mae
          WHERE (mae.deleted_at IS NULL)
            AND (FIND_IN_SET(?, mae.tematik_ids) > 0 OR mae.tagging LIKE ?)
          ORDER BY mae.urutan ASC
        `, [tematikId, `%${tematik.nama}%`]);
        aplikasiExternal = maeRows;
      }
    } catch (e) {
      console.warn('tematikHub: failed to fetch aplikasiExternal:', e.message);
    }

    // Stats Summary
    const stats = {
      totalKegiatan: kegiatan.length,
      totalDokumen: dokumen.length,
      totalSurat: surat.length,
      totalOpd: opdRows.length,
      mandatoryCompleted: dokumenWajib.filter(d => d.file_path).length,
      mandatoryTotal: dokumenWajib.length
    };

    res.json({
      success: true,
      data: {
        tematik,
        stats,
        dokumenWajib,
        kegiatan,
        dokumen,
        surat,
        perangkatDaerah: opdRows,
        dataMakro,
        aplikasiExternal
      }
    });
  } catch (err) {
    console.error('getHubData fatal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// MANDATORY DOCUMENT MANAGEMENT (ALA RPJPD)
// =========================================================================

// Multer upload middleware
const uploadMandatoryMiddleware = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Upload new file directly into library and link to mandatory doc slot
const uploadMandatoryDocument = async (req, res) => {
  try {
    const tematikId = parseInt(req.params.id);
    const { slot_id, nomor_dokumen, tahun, tanggal_penetapan, keterangan } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File wajib diunggah' });
    }
    if (!slot_id) {
      return res.status(400).json({ success: false, message: 'slot_id wajib diisi' });
    }

    const file_path = '/uploads/' + req.file.filename;
    const file_name = req.file.originalname;
    const userId = req.user?.id || null;

    // 1. Insert into dokumen_upload (perpustakaan dokumen)
    const [docRes] = await pool.query(`
      INSERT INTO dokumen_upload (
        nama_file, nama_asli_unggah, path, ukuran, uploaded_by, uploaded_at, is_indexed, is_private
      ) VALUES (?, ?, ?, ?, ?, NOW(), 0, 0)
    `, [file_name, file_name, file_path, req.file.size, userId]);
    const newDocId = docRes.insertId;

    // 2. Insert into dokumen_tematik
    await pool.query(`
      INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id)
      VALUES (?, ?, 0)
    `, [newDocId, tematikId]);

    // 3. Update slot in tematik_dokumen_wajib
    const [prevSlot] = await pool.query('SELECT * FROM tematik_dokumen_wajib WHERE id = ?', [slot_id]);
    const oldValues = prevSlot.length > 0 ? prevSlot[0] : {};

    await pool.query(`
      UPDATE tematik_dokumen_wajib
      SET dokumen_id = ?, file_path = ?, file_name = ?, 
          nomor_dokumen = COALESCE(?, nomor_dokumen), 
          tahun = COALESCE(?, tahun), 
          tanggal_penetapan = COALESCE(?, tanggal_penetapan), 
          keterangan = COALESCE(?, keterangan), 
          updated_by = ?
      WHERE id = ? AND tematik_id = ?
    `, [newDocId, file_path, file_name, nomor_dokumen || null, tahun ? parseInt(tahun) : null, tanggal_penetapan || null, keterangan || null, userId, slot_id, tematikId]);

    // 4. Audit Log
    await auditService.log({
      user_id: userId,
      action: 'UPLOAD_TEMATIK_MANDATORY_DOC',
      table_name: 'tematik_dokumen_wajib',
      record_id: slot_id,
      old_values: oldValues,
      new_values: { tematik_id: tematikId, slot_id, dokumen_id: newDocId, file_path, file_name },
      req
    });

    res.json({
      success: true,
      message: 'Dokumen berhasil diunggah dan dikaitkan ke dokumen wajib tematik',
      data: { dokumen_id: newDocId, file_path, file_name }
    });
  } catch (err) {
    console.error('uploadMandatoryDocument error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Link existing document from library
const linkMandatoryDocument = async (req, res) => {
  try {
    const tematikId = parseInt(req.params.id);
    const { slot_id, dokumen_id, file_path, file_name, nomor_dokumen, tahun, tanggal_penetapan, keterangan } = req.body;

    if (!slot_id || !file_path) {
      return res.status(400).json({ success: false, message: 'slot_id dan file_path wajib diisi' });
    }

    const userId = req.user?.id || null;

    // If dokumen_id provided, ensure link in dokumen_tematik
    if (dokumen_id) {
      await pool.query(`
        INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id)
        VALUES (?, ?, 0)
      `, [dokumen_id, tematikId]);
    }

    // Previous slot for log
    const [prevSlot] = await pool.query('SELECT * FROM tematik_dokumen_wajib WHERE id = ?', [slot_id]);
    const oldValues = prevSlot.length > 0 ? prevSlot[0] : {};

    await pool.query(`
      UPDATE tematik_dokumen_wajib
      SET dokumen_id = ?, file_path = ?, file_name = ?, 
          nomor_dokumen = COALESCE(?, nomor_dokumen), 
          tahun = COALESCE(?, tahun), 
          tanggal_penetapan = COALESCE(?, tanggal_penetapan), 
          keterangan = COALESCE(?, keterangan), 
          updated_by = ?
      WHERE id = ? AND tematik_id = ?
    `, [dokumen_id || null, file_path, file_name || 'Dokumen Terkait', nomor_dokumen || null, tahun ? parseInt(tahun) : null, tanggal_penetapan || null, keterangan || null, userId, slot_id, tematikId]);

    await auditService.log({
      user_id: userId,
      action: 'LINK_TEMATIK_MANDATORY_DOC',
      table_name: 'tematik_dokumen_wajib',
      record_id: slot_id,
      old_values: oldValues,
      new_values: { tematik_id: tematikId, slot_id, dokumen_id, file_path, file_name },
      req
    });

    res.json({
      success: true,
      message: 'Dokumen perpustakaan berhasil dikaitkan ke dokumen wajib tematik'
    });
  } catch (err) {
    console.error('linkMandatoryDocument error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Unlink document from slot
const unlinkMandatoryDocument = async (req, res) => {
  try {
    const tematikId = parseInt(req.params.id);
    const { slot_id } = req.body;

    if (!slot_id) {
      return res.status(400).json({ success: false, message: 'slot_id wajib diisi' });
    }

    const userId = req.user?.id || null;

    const [prevSlot] = await pool.query('SELECT * FROM tematik_dokumen_wajib WHERE id = ?', [slot_id]);
    const oldValues = prevSlot.length > 0 ? prevSlot[0] : {};

    await pool.query(`
      UPDATE tematik_dokumen_wajib
      SET dokumen_id = NULL, file_path = NULL, file_name = NULL, updated_by = ?
      WHERE id = ? AND tematik_id = ?
    `, [userId, slot_id, tematikId]);

    await auditService.log({
      user_id: userId,
      action: 'UNLINK_TEMATIK_MANDATORY_DOC',
      table_name: 'tematik_dokumen_wajib',
      record_id: slot_id,
      old_values: oldValues,
      new_values: { file_path: null, file_name: null },
      req
    });

    res.json({
      success: true,
      message: 'Kaitan dokumen berhasil dihapus'
    });
  } catch (err) {
    console.error('unlinkMandatoryDocument error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get history of changes for a mandatory document slot
const getMandatoryDocHistory = async (req, res) => {
  try {
    const { slot_id } = req.params;
    const query = `
      SELECT 
        al.id,
        al.action,
        al.new_values,
        al.old_values,
        al.created_at,
        u.username,
        pp.nama_lengkap,
        pp.nip
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
      WHERE al.table_name = 'tematik_dokumen_wajib' 
        AND al.record_id = ?
      ORDER BY al.created_at DESC
      LIMIT 20
    `;
    const [rows] = await pool.query(query, [slot_id]);

    const history = rows.map(r => {
      let parsedNew = {};
      try {
        parsedNew = typeof r.new_values === 'string' ? JSON.parse(r.new_values) : r.new_values;
      } catch (e) {
        parsedNew = r.new_values;
      }
      return {
        id: r.id,
        action: r.action,
        file_name: parsedNew?.file_name || 'Dokumen',
        file_path: parsedNew?.file_path || '',
        created_at: r.created_at,
        uploader_name: r.nama_lengkap || r.username || 'Sistem',
        uploader_nip: r.nip || ''
      };
    });

    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { 
  getAll, 
  getById, 
  create, 
  update, 
  remove,
  getHubData,
  uploadMandatoryMiddleware,
  uploadMandatoryDocument,
  linkMandatoryDocument,
  unlinkMandatoryDocument,
  getMandatoryDocHistory
};
