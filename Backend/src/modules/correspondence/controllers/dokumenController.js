const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../../../config/db');
const crypto = require('crypto');
const auditService = require('../../../utils/auditService');

const ABBREVIATIONS = new Set([
  'SKP', 'FGD', 'IPB', 'RPJMD', 'RKPD', 'RPJMN', 'DAU', 'BAPPERIDA', 'BAPPEDA', 
  'TBC', 'PNS', 'PPPK', 'BA', 'DAP', 'PIP', 'SG', 'KAB', 'RKA', 'APBD', 'OPD', 
  'DPA', 'SIPD', 'LKPJ', 'LPPD', 'KUA', 'PPAS', 'WP', 'SWP', 'SK', 'ASN', 
  'PLT', 'PJ', 'DPD', 'DPRD', 'DPR', 'UPTD', 'BOS', 'PPA'
]);

const formatFilename = (name) => {
  if (!name) return '';
  
  const extIdx = name.lastIndexOf('.');
  let baseName = extIdx !== -1 ? name.substring(0, extIdx) : name;
  const ext = extIdx !== -1 ? name.substring(extIdx) : '';
  
  baseName = baseName.replace(/\s+/g, ' ').trim();
  
  const isAllUpperCase = baseName === baseName.toUpperCase();
  const words = baseName.split(' ');
  
  const formattedWords = words.map(word => {
    if (word.length === 0) return '';
    
    // Remove non-alphanumeric chars for abbreviation matching check
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    const upperWord = cleanWord.toUpperCase();
    
    // 1. Check official abbreviations dictionary
    if (ABBREVIATIONS.has(upperWord)) {
      return word.toUpperCase();
    }
    
    // 2. Check if the word contains no vowels (consonant only) like TBC, FGD, WP, SWP, etc.
    const hasVowels = /[aeiouyAEIOUY]/i.test(cleanWord);
    const isOnlyAlphabetic = /^[a-zA-Z]+$/.test(cleanWord);
    if (isOnlyAlphabetic && !hasVowels && cleanWord.length >= 2) {
      return word.toUpperCase();
    }
    
    // 3. Mode A (Mixed Case): If input is not all caps, preserve user's intentionally capitalized words of 2-5 chars
    if (!isAllUpperCase) {
      const isOriginallyAllCaps = word === word.toUpperCase();
      if (isOriginallyAllCaps && word.length >= 2 && word.length <= 5) {
        return word;
      }
    }
    
    // 4. Default: Title Case (Capitalize first letter, lowercase the rest)
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formattedWords.filter(Boolean).join(' ') + ext.toLowerCase();
};

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf', 
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/zip',
            'application/x-zip-compressed',
            'application/x-zip',
            'multipart/x-zip',
            'application/vnd.rar',
            'application/x-rar-compressed',
            'application/x-rar',
            'application/rar',
            'application/x-7z-compressed',
            'application/octet-stream'
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.rar', '.7z', '.csv', '.txt'];
        if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF, Gambar, Office (.doc, .docx, .xlsx, .ppt), dan Arsip (.zip, .rar, .7z) yang diperbolehkan!'));
        }
    }
}).single('file');

// Middleware to handle upload
const uploadFile = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

// Process the uploaded file
const processUpload = async (req, res) => {
    let newDocId = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
        }

        const { jenis_dokumen_id, nama_file: custom_nama, bidang_urusan_ids, is_private } = req.body;
        if (!jenis_dokumen_id) {
            return res.status(400).json({ success: false, message: 'Jenis dokumen wajib dipilih' });
        }

        const isPrivateVal = is_private === 'true' || is_private === true || is_private === 1 || is_private === '1' ? 1 : 0;

        const fileOriginalName = req.file.originalname;
        const finalNamaFile = formatFilename(custom_nama || fileOriginalName);
        const filePath = '/uploads/' + req.file.filename;
        const absolutePath = path.join(__dirname, '../../../../uploads/', req.file.filename);
        const ukuran = req.file.size;

        // Calculate Hash (MD5)
        const fileBuffer = fs.readFileSync(absolutePath);
        const hashHex = crypto.createHash('md5').update(fileBuffer).digest('hex');

        // CHECK FOR DUPLICATES (Strict Blocking)
        // Check both hash and final filename (including extension)
        const [existing] = await pool.query(
            'SELECT id, nama_file, nama_asli_unggah FROM dokumen_upload WHERE (nama_file = ? OR hash = ?) AND is_deleted = 0 LIMIT 1',
            [finalNamaFile, hashHex]
        );

        if (existing.length > 0) {
            // Get the database path of the existing record to verify physical existence
            const [fullDoc] = await pool.query('SELECT path FROM dokumen_upload WHERE id = ?', [existing[0].id]);
            const existingAbsolutePath = path.join(__dirname, '../../../../', fullDoc[0].path);
            const existsOnDisk = fs.existsSync(existingAbsolutePath);

            if (existsOnDisk) {
                // Delete the temporary uploaded file
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                }
                return res.status(409).json({ 
                    success: false, 
                    duplicate: true,
                    message: 'File yang sama telah ada di sistem',
                    existing_file: {
                        id: existing[0].id,
                        nama_file_saat_ini: existing[0].nama_file,
                        nama_asli_unggah: existing[0].nama_asli_unggah || existing[0].nama_file
                    }
                });
            } else {
                // Disaster Recovery: Overwrite existing record to preserve ID links (SKP / Kegiatan)
                const uploaded_by = req.user ? req.user.id : null;
                await pool.query(
                    'UPDATE dokumen_upload SET nama_file = ?, nama_asli_unggah = ?, path = ?, ukuran = ?, hash = ?, uploaded_by = ?, is_private = ? WHERE id = ?',
                    [finalNamaFile, fileOriginalName, filePath, ukuran, hashHex, uploaded_by, isPrivateVal, existing[0].id]
                );

                // Clean old bidang urusan association
                await pool.query('DELETE FROM dokumen_bidang_urusan WHERE dokumen_id = ?', [existing[0].id]);
                
                // Insert new ones
                if (bidang_urusan_ids) {
                    const urusanIds = Array.isArray(bidang_urusan_ids) 
                        ? bidang_urusan_ids 
                        : String(bidang_urusan_ids).split(',').map(s => s.trim()).filter(Boolean);
                    
                    for (const uId of urusanIds) {
                        await pool.query('INSERT INTO dokumen_bidang_urusan (dokumen_id, bidang_urusan_id) VALUES (?, ?)', [existing[0].id, uId]);
                    }
                }

                // Record history
                const userNama = req.user?.nama_lengkap || 'User';
                await pool.query(
                    'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [existing[0].id, uploaded_by, 'edit', `Berkas diunggah ulang untuk memulihkan rujukan fisik yang hilang oleh ${userNama}`]
                );

                return res.json({ 
                    success: true, 
                    message: 'Berkas berhasil dipulihkan & ditautkan kembali secara otomatis',
                    data: {
                        id: existing[0].id,
                        nama_file: finalNamaFile,
                        path: filePath
                    }
                });
            }
        }

        // Assuming user ID is available from auth middleware
        const uploaded_by = req.user ? req.user.id : null;

        const [result] = await pool.query(
            'INSERT INTO dokumen_upload (nama_file, nama_asli_unggah, path, ukuran, hash, jenis_dokumen_id, uploaded_by, is_private) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [finalNamaFile, fileOriginalName, filePath, ukuran, hashHex, jenis_dokumen_id, uploaded_by, isPrivateVal]
        );

        newDocId = result.insertId;

        // Record history
        await pool.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [newDocId, uploaded_by, 'upload', 'File diupload pertama kali']
        );

        // Save bidang urusan tags if provided
        if (bidang_urusan_ids) {
            const urusanIds = Array.isArray(bidang_urusan_ids) 
                ? bidang_urusan_ids 
                : String(bidang_urusan_ids).split(',').map(s => s.trim()).filter(Boolean);
            
            for (const uId of urusanIds) {
                await pool.query('INSERT INTO dokumen_bidang_urusan (dokumen_id, bidang_urusan_id) VALUES (?, ?)', [newDocId, uId]);
            }
        }

        // Save tematik tags if provided
        let { tematik_ids } = req.body;
        if (tematik_ids) {
            // Handle both array and comma-separated string
            const tags = Array.isArray(tematik_ids) 
                ? tematik_ids 
                : String(tematik_ids).split(',').map(s => s.trim()).filter(Boolean);
            
            for (const tId of tags) {
                await pool.query('INSERT INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, 0)', [newDocId, tId]);
            }
        }

        // Log to Audit Trail
        await auditService.log({
            user_id: uploaded_by,
            action: 'UPLOAD_DOCUMENT',
            table_name: 'dokumen_upload',
            record_id: newDocId,
            new_values: { nama_file: finalNamaFile, jenis_dokumen_id },
            req: req
        });

        res.status(201).json({
            success: true,
            message: 'File berhasil diupload',
            data: {
                id: newDocId,
                nama_file: finalNamaFile,
                path: filePath
            }
        });
    } catch (err) {
        // Cleanup file and record if DB insert or tagging fails
        if (req.file) {
            const fs = require('fs');
            const absolutePath = path.join(__dirname, '../../../../uploads/', req.file.filename);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }
        if (newDocId) {
            await pool.query('DELETE FROM dokumen_upload WHERE id = ?', [newDocId]);
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

const getAll = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const userRole = req.user ? req.user.tipe_user_id : null;
        const userInstansiId = req.user ? req.user.instansi_id : null;
        const isSuperAdmin = userRole === 1;

        let query = `
            SELECT 
                d.*, 
                j.dokumen as jenis_dokumen_nama, 
                GROUP_CONCAT(DISTINCT bu.urusan SEPARATOR ', ') as bidang_urusan_nama,
                GROUP_CONCAT(DISTINCT bu.id SEPARATOR ',') as bidang_urusan_ids,
                pp.nama_lengkap as uploader_nama,
                pp.bidang_id as uploader_bidang_id,
                COALESCE(b.singkatan, b.nama_bidang) as uploader_bidang,
                GROUP_CONCAT(DISTINCT t.nama SEPARATOR ',') as tematik_names,
                MAX(s.id) as surat_id,
                MAX(s.tipe_surat) as surat_tipe,
                MAX(s.nomor_surat) as surat_nomor,
                MAX(s.perihal) as surat_perihal,
                MAX(s.asal_surat) as surat_asal,
                MAX(s.tujuan_surat) as surat_tujuan,
                MAX(s.tanggal_surat) as surat_tanggal_surat,
                MAX(s.tanggal_acara) as surat_tanggal_acara,
                MAX(s.tanggal_akhir) as surat_tanggal_akhir,
                MAX(s.employee_id) as surat_employee_id,
                MAX(s.approval_status) as surat_approval_status,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', u_h.nama_lengkap,
                            'user_bidang', COALESCE(NULLIF(b_h.singkatan, ''), NULLIF(b2_h.singkatan, ''), b_h.nama_bidang, b2_h.nama_bidang)
                        )
                    )
                    FROM dokumen_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
                    LEFT JOIN master_bidang_instansi b_h ON u_h.bidang_id = b_h.id
                    LEFT JOIN master_bidang b2_h ON u_h.bidang_id = b2_h.id
                    WHERE h.dokumen_id = d.id
                ) as edit_history
            FROM dokumen_upload d
            LEFT JOIN master_dokumen j ON d.jenis_dokumen_id = j.id
            LEFT JOIN dokumen_bidang_urusan dbu ON d.id = dbu.dokumen_id
            LEFT JOIN master_bidang_urusan bu ON dbu.bidang_urusan_id = bu.id
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            LEFT JOIN master_bidang_instansi b ON pp.bidang_id = b.id
            LEFT JOIN dokumen_tematik dt ON d.id = dt.dokumen_id
            LEFT JOIN master_tematik t ON dt.tematik_id = t.id
            LEFT JOIN surat s ON d.id = s.dokumen_id AND s.is_deleted = 0
            WHERE d.is_deleted = 0 AND (d.is_private = 0 OR d.uploaded_by = ?)
        `;

        const params = [userId];

        if (!isSuperAdmin) {
            query += ` AND pp.instansi_id = ? `;
            params.push(userInstansiId);
        }

        query += `
            GROUP BY d.id
            ORDER BY d.uploaded_at DESC
        `;

        const [rows] = await pool.query(query, params);
        const data = rows.map(row => ({
            ...row,
            edit_history: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : row.edit_history
        }));
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const remove = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Check permission and get info
        const [rows] = await connection.query(`
            SELECT d.nama_file, d.uploaded_by, pp.bidang_id as uploader_bidang_id 
            FROM dokumen_upload d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE d.id = ? AND d.is_deleted = 0
        `, [id]);
        
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        const doc = rows[0];
        const userRole = req.user.tipe_user_id;
        const isSuperadmin = userRole === 1;
        const isAgencyLevel = [2, 5, 7, 8].includes(userRole);
        const isDivisionLevel = [4, 6, 9, 10].includes(userRole);
        
        let hasAccess = isSuperadmin || isAgencyLevel || doc.uploaded_by === req.user.id;
        if (!hasAccess && isDivisionLevel && doc.uploader_bidang_id === req.user.bidang_id) {
            hasAccess = true;
        }

        if (!hasAccess) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk menghapus dokumen ini.' });
        }

        // 1. Soft Delete: Mark as deleted and set timestamp
        await connection.query('UPDATE dokumen_upload SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.id, id]);

        // 1b. Opsi 1: Soft Delete associated letters in Daftar Surat
        const [affectedLetters] = await connection.query('SELECT id FROM surat WHERE dokumen_id = ? AND is_deleted = 0', [id]);
        for (const s of affectedLetters) {
            await connection.query('UPDATE surat SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.id, s.id]);
            await connection.query(
                'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [s.id, req.user.id, 'delete', `Surat otomatis terhapus karena berkas fisik "${doc.nama_file}" dihapus dari perpustakaan.`]
            );
            // Clean up logbook entries if it's a leave letter
            try {
                const { removeLeaveFromLogbook } = require('./suratApprovalController');
                await removeLeaveFromLogbook(s.id);
            } catch (e) {
                console.error('Failed to clean up logbook for leave letter:', e);
            }
        }

        // 2. Find all affected activities for history logging
        const [affectedActivities] = await connection.query(`
            SELECT DISTINCT kegiatan_id FROM (
                SELECT id as kegiatan_id FROM kegiatan_manajemen 
                WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? 
                   OR bahan_desk_id = ? OR paparan_id = ?
                UNION
                SELECT kegiatan_id FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?
            ) as affected
        `, [id, id, id, id, id]);

        // 3. Cascading Cleanup: NULL primary slots in kegiatan_manajemen
        await connection.query(`
            UPDATE kegiatan_manajemen SET 
                surat_undangan_masuk = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk END,
                surat_undangan_masuk_id = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk_id END,
                surat_undangan_keluar = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar END,
                surat_undangan_keluar_id = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar_id END,
                bahan_desk = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk END,
                bahan_desk_id = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk_id END,
                paparan = CASE WHEN paparan_id = ? THEN NULL ELSE paparan END,
                paparan_id = CASE WHEN paparan_id = ? THEN NULL ELSE paparan_id END
            WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? OR bahan_desk_id = ? OR paparan_id = ?
        `, [id, id, id, id, id, id, id, id, id, id, id, id]);

        // 3. Cascading Cleanup: Unlink from kegiatan_manajemen_dokumen
        await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?', [id]);

        // 4. Cascading Cleanup: Remove from individu logbooks (comma separated lampiran_kegiatan)
        await connection.query(`
            UPDATE kegiatan_harian_pegawai 
            SET lampiran_kegiatan = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', lampiran_kegiatan, ','), CONCAT(',', ?, ','), ','))
            WHERE FIND_IN_SET(?, lampiran_kegiatan)
        `, [id, id]);

        // 5. Cascading Cleanup: Unlink from skp_pegawai_docs (SKP files) with history logging
        const [affectedSkp] = await connection.query(`
            SELECT s.pegawai_id, s.tahun, s.bidang_id, s.kategori, s.bulan, s.butir_skp, p.nama AS pegawai_nama 
            FROM skp_pegawai_docs s
            JOIN profil_pegawai p ON s.pegawai_id = p.id
            WHERE s.doc_id = ?
        `, [id]);

        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const userNama = req.user.nama_lengkap || req.user.username || 'User';

        for (const skp of affectedSkp) {
            let logKeterangan = '';
            if (skp.kategori === 'pendukung') {
                const mName = skp.bulan ? monthNames[skp.bulan - 1] : '';
                logKeterangan = `Dokumen pendukung "${doc.nama_file}" terlepas dari SKP ${skp.pegawai_nama} bulan ${mName} karena file dihapus dari perpustakaan oleh ${userNama}`;
            } else {
                const katName = skp.kategori === 'perencanaan' ? 'Perencanaan' : 'Penilaian Akhir';
                logKeterangan = `Dokumen "${doc.nama_file}" terlepas dari SKP ${skp.pegawai_nama} pada kategori ${katName} karena file dihapus dari perpustakaan oleh ${userNama}`;
            }

            await connection.query(`
                INSERT INTO skp_edit_history 
                (pegawai_id, user_id, tahun, bidang_id, kategori, bulan, butir_skp, aksi, keterangan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [skp.pegawai_id, req.user.id, skp.tahun, skp.bidang_id, skp.kategori, skp.bulan || null, skp.butir_skp || null, 'unlink', logKeterangan]);
        }

        await connection.query('DELETE FROM skp_pegawai_docs WHERE doc_id = ?', [id]);

        // Record history for the document itself
        await connection.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [id, req.user.id, 'delete', `Dokumen dipindahkan ke tempat sampah oleh ${userNama}`]
        );

        // Record history for each affected activity
        for (const act of affectedActivities) {
            await connection.query(
                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [act.kegiatan_id, req.user.id, 'edit', `Lampiran "${doc.nama_file}" terlepas otomatis karena file dihapus dari perpustakaan oleh ${userNama}.`]
            );
        }

        await connection.commit();

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'DELETE_DOCUMENT',
            table_name: 'dokumen_upload',
            record_id: id,
            old_values: doc,
            req: req
        });

        res.json({ success: true, message: 'Dokumen dipindahkan ke tempat sampah' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const getTrash = async (req, res) => {
    try {
        const { search } = req.query;
        const userRole = req.user ? req.user.tipe_user_id : null;
        const userInstansiId = req.user ? req.user.instansi_id : null;
        const isSuperAdmin = userRole === 1;

        let docWhere = "d.is_deleted = 1";
        let docParams = [];
        if (!isSuperAdmin) {
            docWhere += " AND pp.instansi_id = ?";
            docParams.push(userInstansiId);
        }

        let suratWhere = "s.is_deleted = 1 AND s.dokumen_id IS NULL";
        let suratParams = [];
        if (!isSuperAdmin) {
            suratWhere += " AND s.instansi_id = ?";
            suratParams.push(userInstansiId);
        }

        let query = `
            SELECT 
                d.id,
                d.nama_file,
                d.nama_asli_unggah,
                d.path,
                d.ukuran,
                d.hash,
                d.jenis_dokumen_id,
                d.uploaded_by,
                d.uploaded_at,
                d.is_deleted,
                d.deleted_at,
                COALESCE(d.deleted_by, (
                    SELECT user_id 
                    FROM dokumen_edit_history 
                    WHERE dokumen_id = d.id AND aksi = 'delete' 
                    ORDER BY created_at DESC LIMIT 1
                )) as deleted_by,
                j.dokumen as jenis_dokumen_nama, 
                pp.nama_lengkap as uploader_nama,
                pp.bidang_id as uploader_bidang_id,
                COALESCE(b.singkatan, b.nama_bidang) as uploader_bidang,
                GROUP_CONCAT(DISTINCT t.nama SEPARATOR ',') as tematik_names,
                'DOCUMENT' as source_type,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', u_h.nama_lengkap,
                            'user_bidang', COALESCE(NULLIF(b_h.singkatan, ''), NULLIF(b2_h.singkatan, ''), b_h.nama_bidang, b2_h.nama_bidang)
                        )
                    )
                    FROM dokumen_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
                    LEFT JOIN master_bidang_instansi b_h ON u_h.bidang_id = b_h.id
                    LEFT JOIN master_bidang b2_h ON u_h.bidang_id = b2_h.id
                    WHERE h.dokumen_id = d.id
                ) as edit_history
            FROM dokumen_upload d
            LEFT JOIN master_dokumen j ON d.jenis_dokumen_id = j.id
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            LEFT JOIN master_bidang_instansi b ON pp.bidang_id = b.id
            LEFT JOIN dokumen_tematik dt ON d.id = dt.dokumen_id
            LEFT JOIN master_tematik t ON dt.tematik_id = t.id
            WHERE ${docWhere}
            GROUP BY d.id

            UNION ALL

            SELECT 
                -s.id as id, -- Negative ID to distinguish from dokumen_upload
                s.perihal as nama_file,
                s.nomor_surat as nama_asli_unggah,
                NULL as path,
                0 as ukuran,
                'SURAT_ONLY' as hash,
                s.jenis_surat_id as jenis_dokumen_id,
                s.created_by as uploaded_by,
                s.created_at as uploaded_at,
                s.is_deleted,
                s.deleted_at,
                COALESCE(s.deleted_by, (
                    SELECT user_id 
                    FROM surat_edit_history 
                    WHERE surat_id = s.id AND aksi = 'delete' 
                    ORDER BY created_at DESC LIMIT 1
                )) as deleted_by,
                md.dokumen as jenis_dokumen_nama,
                pp_s.nama_lengkap as uploader_nama,
                pp_s.bidang_id as uploader_bidang_id,
                COALESCE(b_s.singkatan, b_s.nama_bidang) as uploader_bidang,
                NULL as tematik_names,
                'SURAT' as source_type,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', sh.id,
                            'aksi', sh.aksi,
                            'keterangan', sh.keterangan,
                            'created_at', sh.created_at,
                            'user_nama', u_sh.nama_lengkap,
                            'user_bidang', COALESCE(NULLIF(b_sh.singkatan, ''), NULLIF(b2_sh.singkatan, ''), b_sh.nama_bidang, b2_sh.nama_bidang)
                        )
                    )
                    FROM surat_edit_history sh
                    LEFT JOIN users usr_sh ON sh.user_id = usr_sh.id
                    LEFT JOIN profil_pegawai u_sh ON usr_sh.profil_pegawai_id = u_sh.id
                    LEFT JOIN master_bidang_instansi b_sh ON u_sh.bidang_id = b_sh.id
                    LEFT JOIN master_bidang b2_sh ON u_sh.bidang_id = b2_sh.id
                    WHERE sh.surat_id = s.id
                ) as edit_history
            FROM surat s
            LEFT JOIN master_dokumen md ON s.jenis_surat_id = md.id
            LEFT JOIN users u_s ON s.created_by = u_s.id
            LEFT JOIN profil_pegawai pp_s ON u_s.profil_pegawai_id = pp_s.id
            LEFT JOIN master_bidang_instansi b_s ON pp_s.bidang_id = b_s.id
            WHERE ${suratWhere}
        `;
        let params = [...docParams, ...suratParams];

        // Wrap in subquery to apply search and grouping/ordering correctly
        let finalQuery = `SELECT * FROM (${query}) AS combined_trash WHERE 1=1`;

        if (search) {
            finalQuery += ` AND (nama_file LIKE ? OR jenis_dokumen_nama LIKE ?) `;
            params.push(`%${search}%`, `%${search}%`);
        }

        finalQuery += ` ORDER BY deleted_at DESC `;
        const [rows] = await pool.query(finalQuery, params);
        
        // No need for GROUP BY in final query since the first part already grouped by id
        // and the second part (surat) is unique by s.id
        
        const data = rows.map(row => ({
            ...row,
            edit_history: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : (row.edit_history || [])
        }));
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const restore = async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        if (numericId < 0) {
            // Handle Surat-only restoration (Negative ID marker)
            const suratId = Math.abs(numericId);
            const [suratRows] = await pool.query('SELECT id, dokumen_id, nomor_surat, deleted_by, created_by FROM surat WHERE id = ? AND is_deleted = 1', [suratId]);
            
            if (suratRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Surat tidak ditemukan di tempat sampah' });
            }

            const { dokumen_id, nomor_surat, deleted_by, created_by } = suratRows[0];

            // Restriction Check
            if (req.user.tipe_user_id !== 1) {
                let deleterId = deleted_by;
                if (!deleterId) {
                    // Fallback to history
                    const [historyRows] = await pool.query(
                        'SELECT user_id FROM surat_edit_history WHERE surat_id = ? AND aksi = "delete" ORDER BY created_at DESC LIMIT 1',
                        [suratId]
                    );
                    if (historyRows.length > 0) {
                        deleterId = historyRows[0].user_id;
                    } else {
                        // Fallback to creator
                        deleterId = created_by;
                    }
                }
                if (deleterId !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'Anda hanya bisa memulihkan surat yang Anda hapus sendiri.' });
                }
            }

            await pool.query('UPDATE surat SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [suratId]);

            // Also restore associated document if exists
            if (dokumen_id) {
                await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [dokumen_id]);
                await pool.query(
                    'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [dokumen_id, req.user.id, 'restore', `Dokumen otomatis dipulihkan karena Surat "${nomor_surat}" dipulihkan.`]
                );
            }

            try {
                const { integrateLeaveToLogbook } = require('./suratApprovalController');
                await integrateLeaveToLogbook(suratId);
            } catch (e) {
                console.error('Failed to re-integrate leave letter to logbook on restore:', e);
            }
            return res.json({ success: true, message: 'Surat berhasil dipulihkan' });
        }

        // Handle regular Document restoration
        const [rows] = await pool.query('SELECT id, nama_file, hash, deleted_by, uploaded_by FROM dokumen_upload WHERE id = ? AND is_deleted = 1', [numericId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }

        const docToRestore = rows[0];

        // Restriction Check
        if (req.user.tipe_user_id !== 1) {
            let deleterId = docToRestore.deleted_by;
            if (!deleterId) {
                // Fallback to history
                const [historyRows] = await pool.query(
                    'SELECT user_id FROM dokumen_edit_history WHERE dokumen_id = ? AND aksi = "delete" ORDER BY created_at DESC LIMIT 1',
                    [numericId]
                );
                if (historyRows.length > 0) {
                    deleterId = historyRows[0].user_id;
                } else {
                    // Fallback to uploader
                    deleterId = docToRestore.uploaded_by;
                }
            }
            if (deleterId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Anda hanya bisa memulihkan dokumen yang Anda hapus sendiri.' });
            }
        }

        // CHECK IF ACTIVE DUPLICATE EXISTS
        let existing = [];
        if (docToRestore.hash) {
            [existing] = await pool.query(
                'SELECT id, nama_file FROM dokumen_upload WHERE (nama_file = ? OR hash = ?) AND is_deleted = 0 LIMIT 1',
                [docToRestore.nama_file, docToRestore.hash]
            );
        } else {
            [existing] = await pool.query(
                'SELECT id, nama_file FROM dokumen_upload WHERE nama_file = ? AND is_deleted = 0 LIMIT 1',
                [docToRestore.nama_file]
            );
        }

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                message: 'Gagal memulihkan: Berkas yang sama sudah aktif di perpustakaan',
                existing_file: {
                    id: existing[0].id,
                    nama_file: existing[0].nama_file
                }
            });
        }

        await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [numericId]);

        // Find associated letters that are currently deleted
        const [restoredLetters] = await pool.query('SELECT id FROM surat WHERE dokumen_id = ? AND is_deleted = 1', [numericId]);

        // Also restore associated surat if exists
        await pool.query('UPDATE surat SET is_deleted = 0, deleted_at = NULL WHERE dokumen_id = ?', [numericId]);

        // Re-integrate leave letters to logbook
        for (const s of restoredLetters) {
            try {
                const { integrateLeaveToLogbook } = require('./suratApprovalController');
                await integrateLeaveToLogbook(s.id);
            } catch (e) {
                console.error('Failed to re-integrate leave letter to logbook on restore:', e);
            }
        }

        // Record history
        await pool.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [numericId, req.user.id, 'restore', `Dokumen dipulihkan dari tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
        );

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'RESTORE_DOCUMENT',
            table_name: 'dokumen_upload',
            record_id: numericId,
            req: req
        });

        res.json({ success: true, message: 'Dokumen berhasil dipulihkan' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const permanentDelete = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const numericId = parseInt(id);

        const userRole = req.user.tipe_user_id;
        const isSuperAdmin = userRole === 1;
        const isAdminInstansi = userRole === 2;
        const isAdminBapperida = userRole === 8 || req.user.instansi_id === 2;

        if (!isSuperAdmin && !isAdminInstansi && !isAdminBapperida) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Hanya Superadmin, Admin Instansi, dan Admin Bapperida yang dapat menghapus secara permanen.' });
        }

        if (numericId < 0) {
            // Handle Surat-only permanent delete (Negative ID marker)
            const suratId = Math.abs(numericId);
            
            const [suratRows] = await connection.query('SELECT dokumen_id FROM surat WHERE id = ? AND is_deleted = 1', [suratId]);
            if (suratRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Surat tidak ditemukan di tempat sampah' });
            }
            
            const { dokumen_id: assocDocId } = suratRows[0];

            await connection.query('DELETE FROM surat_approvals WHERE surat_id = ?', [suratId]);
            await connection.query('DELETE FROM surat_edit_history WHERE surat_id = ?', [suratId]);
            await connection.query('DELETE FROM surat WHERE id = ? AND is_deleted = 1', [suratId]);
            
            // If it had a physical document, permanently delete that document too
            if (assocDocId) {
                const [docRows] = await connection.query('SELECT path FROM dokumen_upload WHERE id = ? AND is_deleted = 1', [assocDocId]);
                if (docRows.length > 0) {
                    const { path: filePath } = docRows[0];
                    await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id = ?', [assocDocId]);
                    await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ?', [assocDocId]);
                    await connection.query('DELETE FROM dokumen_bidang_urusan WHERE dokumen_id = ?', [assocDocId]);
                    await connection.query('DELETE FROM dokumen_upload WHERE id = ?', [assocDocId]);
                    
                    if (filePath) {
                        const fs = require('fs');
                        const path = require('path');
                        const absolutePath = path.join(__dirname, '../..', filePath);
                        if (fs.existsSync(absolutePath)) {
                            fs.unlinkSync(absolutePath);
                        }
                    }
                }
            }

            await connection.commit();
            return res.json({ success: true, message: 'Surat berhasil dihapus secara permanen' });
        }

        const [docRows] = await connection.query('SELECT nama_file, path FROM dokumen_upload WHERE id = ? AND is_deleted = 1', [id]);
        if (docRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }
        const docName = docRows[0].nama_file;
        const filePath = docRows[0].path;

        // Find affected activities for history logging
        const [affectedActivities] = await connection.query(`
            SELECT DISTINCT kegiatan_id FROM (
                SELECT id as kegiatan_id FROM kegiatan_manajemen 
                WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? 
                   OR bahan_desk_id = ? OR paparan_id = ?
                UNION
                SELECT kegiatan_id FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?
            ) as affected
        `, [id, id, id, id, id]);

        // 1. Cascading Cleanup: Primary slots in kegiatan_manajemen
        await connection.query(`
            UPDATE kegiatan_manajemen SET 
                surat_undangan_masuk = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk END,
                surat_undangan_masuk_id = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk_id END,
                surat_undangan_keluar = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar END,
                surat_undangan_keluar_id = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar_id END,
                bahan_desk = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk END,
                bahan_desk_id = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk_id END,
                paparan = CASE WHEN paparan_id = ? THEN NULL ELSE paparan END,
                paparan_id = CASE WHEN paparan_id = ? THEN NULL ELSE paparan_id END
            WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? OR bahan_desk_id = ? OR paparan_id = ?
        `, [id, id, id, id, id, id, id, id, id, id, id, id]);

        // 2. Cascading Cleanup: Unlink from kegiatan_manajemen_dokumen
        await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?', [id]);

        // 3. Cascading Cleanup: Remove from individu logbooks (comma separated lampiran_kegiatan)
        await connection.query(`
            UPDATE kegiatan_harian_pegawai 
            SET lampiran_kegiatan = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', lampiran_kegiatan, ','), CONCAT(',', ?, ','), ','))
            WHERE FIND_IN_SET(?, lampiran_kegiatan)
        `, [id, id]);

        // 4. Cascading Cleanup: Unlink from skp_pegawai_docs (SKP files)
        await connection.query('DELETE FROM skp_pegawai_docs WHERE doc_id = ?', [id]);

        // Delete from DB
        await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id = ?', [id]);
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ?', [id]);
        await connection.query('DELETE FROM dokumen_bidang_urusan WHERE dokumen_id = ?', [id]);
        
        // Permanently delete associated letters and their history/approvals
        await connection.query('DELETE FROM surat_edit_history WHERE surat_id IN (SELECT id FROM surat WHERE dokumen_id = ?)', [id]);
        await connection.query('DELETE FROM surat_approvals WHERE surat_id IN (SELECT id FROM surat WHERE dokumen_id = ?)', [id]);
        await connection.query('DELETE FROM surat WHERE dokumen_id = ?', [id]);

        const [result] = await connection.query('DELETE FROM dokumen_upload WHERE id = ?', [id]);

        // Delete file from disk
        if (result.affectedRows > 0) {
            const fs = require('fs');
            const path = require('path');
            const absolutePath = path.join(__dirname, '../..', filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        // Record history for each affected activity
        for (const act of affectedActivities) {
            await connection.query(
                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [act.kegiatan_id, req.user.id, 'edit', `Lampiran "${docName}" terhapus permanen dari sistem.`]
            );
        }

        // Record history for each affected activity
        for (const act of affectedActivities) {
            await connection.query(
                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [act.kegiatan_id, req.user.id, 'edit', `Lampiran "${docName}" terhapus permanen dari sistem.`]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Dokumen dihapus secara permanen' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const update = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { nama_file, jenis_dokumen_id, tematik_ids, bidang_urusan_id, is_private } = req.body;

        if (!nama_file || !jenis_dokumen_id) {
            return res.status(400).json({ success: false, message: 'Nama file dan jenis dokumen wajib diisi' });
        }

        const isPrivateVal = is_private === 'true' || is_private === true || is_private === 1 || is_private === '1' ? 1 : 0;
        const numericId = Number(id);

        if (numericId < 0) {
            const suratId = Math.abs(numericId);
            const [suratRows] = await connection.query(`
                SELECT s.created_by, s.bidang_id, pp.bidang_id as creator_bidang_id 
                FROM surat s
                LEFT JOIN users u ON s.created_by = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                WHERE s.id = ? AND s.is_deleted = 0
            `, [suratId]);

            if (suratRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Surat tidak ditemukan' });
            }

            const suratData = suratRows[0];
            const userRole = req.user.tipe_user_id;
            const isSuperadmin = userRole === 1;
            const isAgencyLevel = [2, 5, 7, 8].includes(userRole);
            const isDivisionLevel = [4, 6, 9, 10].includes(userRole);

            let hasAccess = isSuperadmin || isAgencyLevel || suratData.created_by === req.user.id;
            if (!hasAccess && isDivisionLevel && suratData.bidang_id === req.user.bidang_id) {
                hasAccess = true;
            }

            if (!hasAccess) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk mengubah surat ini.' });
            }

            // 1. Get associated dokumen_id if any
            const [suratFull] = await connection.query('SELECT dokumen_id FROM surat WHERE id = ?', [suratId]);
            const assocDocId = suratFull[0]?.dokumen_id;

            // 2. Update surat table
            const cleanPerihal = nama_file.replace(/\.[a-zA-Z0-9]+$/i, '');
            await connection.query(
                'UPDATE surat SET perihal = ?, jenis_surat_id = ? WHERE id = ?',
                [cleanPerihal, jenis_dokumen_id, suratId]
            );

            // 3. Update associated dokumen_upload if exists
            if (assocDocId) {
                const formattedNamaFile = formatFilename(nama_file);
                await connection.query(
                    'UPDATE dokumen_upload SET nama_file = ?, jenis_dokumen_id = ?, is_private = ? WHERE id = ?',
                    [formattedNamaFile, jenis_dokumen_id, isPrivateVal, assocDocId]
                );
            }

            // 4. Record history for surat
            await connection.query(
                'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [suratId, req.user.id, 'edit', `Kategori/Perihal diubah melalui perpustakaan`]
            );

            await connection.commit();
            return res.json({ success: true, message: 'Surat berhasil diperbarui.' });
        }

        // Check permission
        const [rows] = await connection.query(`
            SELECT d.uploaded_by, pp.bidang_id as uploader_bidang_id 
            FROM dokumen_upload d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE d.id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        const doc = rows[0];
        const userRole = req.user.tipe_user_id;
        const isSuperadmin = userRole === 1;
        const isAgencyLevel = [2, 5, 7, 8].includes(userRole);
        const isDivisionLevel = [4, 6, 9, 10].includes(userRole);
        
        let hasAccess = isSuperadmin || isAgencyLevel || doc.uploaded_by === req.user.id;
        if (!hasAccess && isDivisionLevel && doc.uploader_bidang_id === req.user.bidang_id) {
            hasAccess = true;
        }

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk mengubah dokumen ini.' });
        }

        const formattedNamaFile = formatFilename(nama_file);

        // Get old values for comparison
        const [oldDoc] = await connection.query('SELECT nama_file, jenis_dokumen_id, is_private FROM dokumen_upload WHERE id = ?', [id]);
        
        // Update main record
        await connection.query(
            'UPDATE dokumen_upload SET nama_file = ?, jenis_dokumen_id = ?, is_private = ? WHERE id = ?',
            [formattedNamaFile, jenis_dokumen_id, isPrivateVal, id]
        );

        // Sync to associated surat if exists
        await connection.query(
            'UPDATE surat SET jenis_surat_id = ? WHERE dokumen_id = ?',
            [Number(jenis_dokumen_id), Number(id)]
        );

        // Record history
        let changes = [];
        if (oldDoc[0].nama_file !== formattedNamaFile) changes.push(`Nama file diubah: "${oldDoc[0].nama_file}" -> "${formattedNamaFile}"`);
        if (oldDoc[0].jenis_dokumen_id !== parseInt(jenis_dokumen_id)) {
            const [jenisOld] = await connection.query('SELECT dokumen FROM master_dokumen WHERE id = ?', [oldDoc[0].jenis_dokumen_id]);
            const [jenisNew] = await connection.query('SELECT dokumen FROM master_dokumen WHERE id = ?', [jenis_dokumen_id]);
            changes.push(`Kategori diubah: "${jenisOld[0]?.dokumen || 'Unknown'}" -> "${jenisNew[0]?.dokumen || 'Unknown'}"`);
        }
        if (oldDoc[0].is_private !== isPrivateVal) {
            changes.push(`Status akses diubah: "${oldDoc[0].is_private ? 'Pribadi' : 'Share'}" -> "${isPrivateVal ? 'Pribadi' : 'Share'}"`);
        }

        // Get old urusan list for comparison in history
        const [oldUrursanList] = await connection.query(`
            SELECT GROUP_CONCAT(bu.urusan SEPARATOR ', ') as urusan_names 
            FROM dokumen_bidang_urusan dbu 
            JOIN master_bidang_urusan bu ON dbu.bidang_urusan_id = bu.id 
            WHERE dbu.dokumen_id = ?
        `, [id]);

        // Update bidang urusan tags
        await connection.query('DELETE FROM dokumen_bidang_urusan WHERE dokumen_id = ?', [id]);
        
        const { bidang_urusan_ids } = req.body;
        if (bidang_urusan_ids) {
            const urusanIds = Array.isArray(bidang_urusan_ids) 
                ? bidang_urusan_ids 
                : String(bidang_urusan_ids).split(',').map(s => s.trim()).filter(Boolean);
            
            for (const uId of urusanIds) {
                await connection.query('INSERT INTO dokumen_bidang_urusan (dokumen_id, bidang_urusan_id) VALUES (?, ?)', [id, uId]);
            }
        }

        // Get new urusan list for comparison
        const [newUrursanList] = await connection.query(`
            SELECT GROUP_CONCAT(bu.urusan SEPARATOR ', ') as urusan_names 
            FROM dokumen_bidang_urusan dbu 
            JOIN master_bidang_urusan bu ON dbu.bidang_urusan_id = bu.id 
            WHERE dbu.dokumen_id = ?
        `, [id]);

        const oldUrusanStr = oldUrursanList[0]?.urusan_names || 'Kosong';
        const newUrusanStr = newUrursanList[0]?.urusan_names || 'Kosong';
        if (oldUrusanStr !== newUrusanStr) {
            changes.push(`Bidang Urusan diubah: "${oldUrusanStr}" -> "${newUrusanStr}"`);
        }

        if (changes.length > 0) {
            await connection.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [id, req.user.id, 'edit', changes.join(', ')]
            );
        }

        // Update tematik tags (Only for source kegiatan_id = 0, which is original management)
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = 0', [id]);
        
        if (tematik_ids) {
            const tags = Array.isArray(tematik_ids) 
                ? tematik_ids 
                : String(tematik_ids).split(',').map(s => s.trim()).filter(Boolean);
            
            for (const tId of tags) {
                await connection.query('INSERT INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, 0)', [id, tId]);
            }
        }

        await connection.commit();

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'UPDATE_DOCUMENT',
            table_name: 'dokumen_upload',
            record_id: id,
            old_values: oldDoc[0],
            new_values: req.body,
            req: req
        });

        res.json({ success: true, message: 'Dokumen berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const bulkRestore = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Daftar ID tidak valid' });
        }

        const docIds = ids.filter(id => id > 0);
        const suratIds = ids.filter(id => id < 0).map(id => Math.abs(id));

        // 1. Authorisation Check for Documents
        if (docIds.length > 0) {
            const [docs] = await pool.query(
                'SELECT id, deleted_by, uploaded_by FROM dokumen_upload WHERE id IN (?) AND is_deleted = 1',
                [docIds]
            );
            if (docs.length !== docIds.length) {
                return res.status(404).json({ success: false, message: 'Sebagian dokumen tidak ditemukan di tempat sampah' });
            }
            if (req.user.tipe_user_id !== 1) {
                for (const doc of docs) {
                    let deleterId = doc.deleted_by;
                    if (!deleterId) {
                        const [historyRows] = await pool.query(
                            'SELECT user_id FROM dokumen_edit_history WHERE dokumen_id = ? AND aksi = "delete" ORDER BY created_at DESC LIMIT 1',
                            [doc.id]
                        );
                        if (historyRows.length > 0) {
                            deleterId = historyRows[0].user_id;
                        } else {
                            deleterId = doc.uploaded_by;
                        }
                    }
                    if (deleterId !== req.user.id) {
                        return res.status(403).json({ success: false, message: 'Gagal memulihkan: Anda hanya bisa memulihkan dokumen yang Anda hapus sendiri.' });
                    }
                }
            }
        }

        // 2. Authorisation Check for Surat
        if (suratIds.length > 0) {
            const [surats] = await pool.query(
                'SELECT id, deleted_by, created_by FROM surat WHERE id IN (?) AND is_deleted = 1',
                [suratIds]
            );
            if (surats.length !== suratIds.length) {
                return res.status(404).json({ success: false, message: 'Sebagian surat tidak ditemukan di tempat sampah' });
            }
            if (req.user.tipe_user_id !== 1) {
                for (const s of surats) {
                    let deleterId = s.deleted_by;
                    if (!deleterId) {
                        const [historyRows] = await pool.query(
                            'SELECT user_id FROM surat_edit_history WHERE surat_id = ? AND aksi = "delete" ORDER BY created_at DESC LIMIT 1',
                            [s.id]
                        );
                        if (historyRows.length > 0) {
                            deleterId = historyRows[0].user_id;
                        } else {
                            deleterId = s.created_by;
                        }
                    }
                    if (deleterId !== req.user.id) {
                        return res.status(403).json({ success: false, message: 'Gagal memulihkan: Anda hanya bisa memulihkan surat yang Anda hapus sendiri.' });
                    }
                }
            }
        }

        // 3. Execution for Documents
        if (docIds.length > 0) {
            await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id IN (?)', [docIds]);
            
            // Find associated letters that are currently deleted
            const [restoredLetters] = await pool.query('SELECT id FROM surat WHERE dokumen_id IN (?) AND is_deleted = 1', [docIds]);
            await pool.query('UPDATE surat SET is_deleted = 0, deleted_at = NULL WHERE dokumen_id IN (?)', [docIds]);

            // Re-integrate leave letters to logbook
            for (const s of restoredLetters) {
                try {
                    const { integrateLeaveToLogbook } = require('./suratApprovalController');
                    await integrateLeaveToLogbook(s.id);
                } catch (e) {
                    console.error('Failed to re-integrate leave letter to logbook on restore:', e);
                }
            }

            // Record history for all
            for (const id of docIds) {
                await pool.query(
                    'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [id, req.user.id, 'restore', `Dokumen dipulihkan secara massal oleh ${req.user.nama_lengkap || 'User'}`]
                );
            }
        }

        // 4. Execution for Surat
        if (suratIds.length > 0) {
            await pool.query('UPDATE surat SET is_deleted = 0, deleted_at = NULL WHERE id IN (?)', [suratIds]);

            for (const sId of suratIds) {
                const [suratRows] = await pool.query('SELECT dokumen_id, nomor_surat FROM surat WHERE id = ?', [sId]);
                if (suratRows.length > 0 && suratRows[0].dokumen_id) {
                    const { dokumen_id, nomor_surat } = suratRows[0];
                    await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [dokumen_id]);
                    await pool.query(
                        'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                        [dokumen_id, req.user.id, 'restore', `Dokumen otomatis dipulihkan karena Surat "${nomor_surat}" dipulihkan.`]
                    );
                }
                
                try {
                    const { integrateLeaveToLogbook } = require('./suratApprovalController');
                    await integrateLeaveToLogbook(sId);
                } catch (e) {
                    console.error('Failed to re-integrate leave letter to logbook on restore:', e);
                }
            }
        }

        res.json({ success: true, message: `${ids.length} item berhasil dipulihkan` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const bulkPermanentDelete = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { ids } = req.body;

        const userRole = req.user.tipe_user_id;
        const isSuperAdmin = userRole === 1;
        const isAdminInstansi = userRole === 2;
        const isAdminBapperida = userRole === 8 || req.user.instansi_id === 2;

        if (!isSuperAdmin && !isAdminInstansi && !isAdminBapperida) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Hanya Superadmin, Admin Instansi, dan Admin Bapperida yang dapat menghapus secara permanen.' });
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Daftar ID tidak valid' });
        }

        const [rows] = await connection.query('SELECT id, path FROM dokumen_upload WHERE id IN (?) AND is_deleted = 1', [ids]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }

        const foundIds = rows.map(r => r.id);
        const paths = rows.map(r => r.path);

        // 1. Cascading Cleanup and History Logging for ALL IDs
        for (const id of foundIds) {
            const docName = rows.find(r => r.id === id)?.nama_file || 'Dokumen';

            // Find affected activities for this specific document
            const [affectedActivities] = await connection.query(`
                SELECT DISTINCT kegiatan_id FROM (
                    SELECT id as kegiatan_id FROM kegiatan_manajemen 
                    WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? 
                       OR bahan_desk_id = ? OR paparan_id = ?
                    UNION
                    SELECT kegiatan_id FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?
                ) as affected
            `, [id, id, id, id, id]);

            // NULL primary slots in kegiatan_manajemen
            await connection.query(`
                UPDATE kegiatan_manajemen SET 
                    surat_undangan_masuk = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk END,
                    surat_undangan_masuk_id = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk_id END,
                    surat_undangan_keluar = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar END,
                    surat_undangan_keluar_id = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar_id END,
                    bahan_desk = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk END,
                    bahan_desk_id = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk_id END,
                    paparan = CASE WHEN paparan_id = ? THEN NULL ELSE paparan END,
                    paparan_id = CASE WHEN paparan_id = ? THEN NULL ELSE paparan_id END
                WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? OR bahan_desk_id = ? OR paparan_id = ?
            `, [id, id, id, id, id, id, id, id, id, id, id, id]);

            // Unlink from individu logbooks
            await connection.query(`
                UPDATE kegiatan_harian_pegawai 
                SET lampiran_kegiatan = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', lampiran_kegiatan, ','), CONCAT(',', ?, ','), ','))
                WHERE FIND_IN_SET(?, lampiran_kegiatan)
            `, [id, id]);

            // Record history for each affected activity
            for (const act of affectedActivities) {
                await connection.query(
                    'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [act.kegiatan_id, req.user.id, 'edit', `Lampiran "${docName}" terhapus permanen dari sistem (Bulk Delete).`]
                );
            }
        }

        // Unlink associations (bulk)
        await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id IN (?)', [foundIds]);
        await connection.query('DELETE FROM skp_pegawai_docs WHERE doc_id IN (?)', [foundIds]);

        // Delete from DB
        await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id IN (?)', [foundIds]);
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id IN (?)', [foundIds]);
        await connection.query('DELETE FROM dokumen_bidang_urusan WHERE dokumen_id IN (?)', [foundIds]);
        const [result] = await connection.query('DELETE FROM dokumen_upload WHERE id IN (?)', [foundIds]);

        // Delete files from disk
        const fs = require('fs');
        const path = require('path');
        if (result.affectedRows > 0) {
            for (const filePath of paths) {
                const absolutePath = path.join(__dirname, '../..', filePath);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                }
            }
        }

        await connection.commit();
        res.json({ success: true, message: `${foundIds.length} dokumen berhasil dihapus secara permanen` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const emptyTrash = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userRole = req.user.tipe_user_id;
        const isSuperadmin = userRole === 1;
        const isAdminInstansi = userRole === 2;
        const isAdminBapperida = userRole === 8 || req.user.instansi_id === 2;

        if (!isSuperadmin && !isAdminInstansi && !isAdminBapperida) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Hanya Superadmin, Admin Instansi, dan Admin Bapperida yang dapat mengosongkan tempat sampah.' });
        }

        let query = `
            SELECT d.id, d.path 
            FROM dokumen_upload d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE d.is_deleted = 1
        `;
        let params = [];

        if (isSuperadmin) {
            // No filter
        } else {
            query += ' AND pp.instansi_id = ?';
            params.push(req.user.instansi_id);
        }

        const [docs] = await connection.query(query, params);
        
        // Also find "pure" surat (drafts without dokumen_id) that are deleted
        let suratQuery = 'SELECT id FROM surat WHERE is_deleted = 1 AND dokumen_id IS NULL';
        let suratParams = [];
        if (isSuperadmin) {
            // No filter
        } else {
            suratQuery += ' AND instansi_id = ?';
            suratParams.push(req.user.instansi_id);
        }
        const [surats] = await connection.query(suratQuery, suratParams);

        if (docs.length === 0 && surats.length === 0) {
            await connection.rollback();
            return res.json({ success: true, message: 'Tempat sampah sudah kosong.' });
        }

        const ids = docs.map(d => d.id);
        const paths = docs.map(d => d.path);
        const suratIds = surats.map(s => s.id);

        // 1. Cascading Cleanup for Document IDs
        if (ids.length > 0) {
            for (const id of ids) {
                await connection.query(`
                    UPDATE kegiatan_manajemen SET 
                        surat_undangan_masuk = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk END,
                        surat_undangan_masuk_id = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk_id END,
                        surat_undangan_keluar = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar END,
                        surat_undangan_keluar_id = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar_id END,
                        bahan_desk = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk END,
                        bahan_desk_id = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk_id END,
                        paparan = CASE WHEN paparan_id = ? THEN NULL ELSE paparan END,
                        paparan_id = CASE WHEN paparan_id = ? THEN NULL ELSE paparan_id END
                    WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? OR bahan_desk_id = ? OR paparan_id = ?
                `, [id, id, id, id, id, id, id, id, id, id, id, id]);

                await connection.query(`
                    UPDATE kegiatan_harian_pegawai 
                    SET lampiran_kegiatan = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', lampiran_kegiatan, ','), CONCAT(',', ?, ','), ','))
                    WHERE FIND_IN_SET(?, lampiran_kegiatan)
                `, [id, id]);
            }

            await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id IN (?)', [ids]);
            await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id IN (?)', [ids]);
            await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id IN (?)', [ids]);
            await connection.query('DELETE FROM dokumen_bidang_urusan WHERE dokumen_id IN (?)', [ids]);
            await connection.query('DELETE FROM dokumen_upload WHERE id IN (?)', [ids]);

            const fs = require('fs');
            const path = require('path');
            for (const filePath of paths) {
                const absolutePath = path.join(__dirname, '../..', filePath);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                }
            }
        }

        // 2. Cascading Cleanup for Pure Surat IDs
        if (suratIds.length > 0) {
            await connection.query('DELETE FROM surat_approvals WHERE surat_id IN (?)', [suratIds]);
            await connection.query('DELETE FROM surat_edit_history WHERE surat_id IN (?)', [suratIds]);
            await connection.query('DELETE FROM surat WHERE id IN (?)', [suratIds]);
        }

        await connection.commit();
        res.json({ success: true, message: `Berhasil mengosongkan ${ids.length} dokumen dan ${suratIds.length} draft surat.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const checkDependencies = async (req, res) => {
    try {
        const { id } = req.params;
        const docId = Number(id);
        if (!docId) {
            return res.status(400).json({ success: false, message: 'Invalid document ID' });
        }

        // 1. Check SKP
        const [skpRows] = await pool.query(`
            SELECT DISTINCT s.tahun, s.kategori, s.bulan, s.butir_skp, p.nama AS pegawai_nama 
            FROM skp_pegawai_docs s
            JOIN profil_pegawai p ON s.pegawai_id = p.id
            WHERE s.doc_id = ?
        `, [docId]);

        // 2. Check Kegiatan Utama
        const [kegiatanUtamaRows] = await pool.query(`
            SELECT DISTINCT id, nama_kegiatan, tanggal FROM kegiatan_manajemen
            WHERE surat_undangan_masuk_id = ? OR surat_undangan_keluar_id = ? 
               OR bahan_desk_id = ? OR paparan_id = ?
        `, [docId, docId, docId, docId]);

        // 3. Check Lampiran Kegiatan
        const [lampiranKegiatanRows] = await pool.query(`
            SELECT DISTINCT k.id, k.nama_kegiatan, k.tanggal 
            FROM kegiatan_manajemen_dokumen kmd
            JOIN kegiatan_manajemen k ON kmd.kegiatan_id = k.id
            WHERE kmd.dokumen_id = ?
        `, [docId]);

        // 4. Check Logbook Pegawai
        const [logbookRows] = await pool.query(`
            SELECT DISTINCT khp.id, khp.nama_kegiatan, khp.tanggal, p.nama AS pegawai_nama
            FROM kegiatan_harian_pegawai khp
            JOIN profil_pegawai p ON khp.profil_pegawai_id = p.id
            WHERE FIND_IN_SET(?, khp.lampiran_kegiatan)
        `, [docId]);

        const hasDependencies = skpRows.length > 0 || kegiatanUtamaRows.length > 0 || lampiranKegiatanRows.length > 0 || logbookRows.length > 0;

        res.json({
            success: true,
            has_dependencies: hasDependencies,
            dependencies: {
                skp: skpRows,
                kegiatan_utama: kegiatanUtamaRows,
                lampiran_kegiatan: lampiranKegiatanRows,
                logbook: logbookRows
            }
        });
    } catch (err) {
        console.error('Error checking document dependencies:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT nama_asli_unggah, path FROM dokumen_upload WHERE id = ? AND is_deleted = 0',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
        }

        const doc = rows[0];
        const fileName = doc.nama_asli_unggah || 'dokumen.xlsx';
        
        // Extract actual file name on disk
        const fileDiskName = doc.path.replace('/uploads/', '');
        const path = require('path');
        const absolutePath = path.join(process.cwd(), 'uploads', fileDiskName);

        const fs = require('fs');
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'File fisik tidak ditemukan di server.' });
        }

        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        return res.download(absolutePath, fileName);
    } catch (err) {
        console.error('Error downloading document:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

const downloadByPath = async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ success: false, message: 'Path tidak boleh kosong.' });
        }

        // Clean path to prevent directory traversal attack
        const path = require('path');
        const fileDiskName = path.basename(filePath);
        const absolutePath = path.join(process.cwd(), 'uploads', fileDiskName);

        const fs = require('fs');
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'File fisik tidak ditemukan di server.' });
        }

        // Find original name in database
        const dbPath = filePath.startsWith('/uploads/') ? filePath : `/uploads/${fileDiskName}`;
        const [rows] = await pool.query(
            'SELECT nama_asli_unggah FROM dokumen_upload WHERE path = ? AND is_deleted = 0 LIMIT 1',
            [dbPath]
        );

        const fileName = (rows.length > 0 && rows[0].nama_asli_unggah) 
            ? rows[0].nama_asli_unggah 
            : fileDiskName;

        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        return res.download(absolutePath, fileName);
    } catch (err) {
        console.error('Error downloading document by path:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { 
    uploadFile, 
    processUpload, 
    getAll, 
    remove, 
    update, 
    getTrash, 
    restore, 
    permanentDelete,
    bulkRestore,
    bulkPermanentDelete,
    emptyTrash,
    checkDependencies,
    downloadFile,
    downloadByPath
};
