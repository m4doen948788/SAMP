const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../../../config/db');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
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
            'application/vnd.ms-excel'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF, Gambar, dan Dokumen Office (.doc, .docx, .xlsx, .ppt) yang diperbolehkan!'));
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

        const { jenis_dokumen_id, nama_file: custom_nama } = req.body;
        if (!jenis_dokumen_id) {
            return res.status(400).json({ success: false, message: 'Jenis dokumen wajib dipilih' });
        }

        const fileOriginalName = req.file.originalname;
        const finalNamaFile = custom_nama || fileOriginalName;
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
        }

        // Assuming user ID is available from auth middleware
        const uploaded_by = req.user ? req.user.id : null;

        const [result] = await pool.query(
            'INSERT INTO dokumen_upload (nama_file, nama_asli_unggah, path, ukuran, hash, jenis_dokumen_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [finalNamaFile, fileOriginalName, filePath, ukuran, hashHex, jenis_dokumen_id, uploaded_by]
        );

        newDocId = result.insertId;

        // Record history
        await pool.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [newDocId, uploaded_by, 'upload', 'File diupload pertama kali']
        );

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
        const query = `
            SELECT 
                d.*, 
                j.dokumen as jenis_dokumen_nama, 
                pp.nama_lengkap as uploader_nama,
                pp.bidang_id as uploader_bidang_id,
                COALESCE(b.singkatan, b.nama_bidang) as uploader_bidang,
                GROUP_CONCAT(DISTINCT t.nama SEPARATOR ',') as tematik_names,
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
            WHERE d.is_deleted = 0
            GROUP BY d.id
            ORDER BY d.uploaded_at DESC
        `;
        const [rows] = await pool.query(query);
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
        await connection.query('UPDATE dokumen_upload SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [id]);

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

        // Record history for the document itself
        await connection.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [id, req.user.id, 'delete', `Dokumen dipindahkan ke tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
        );

        // Record history for each affected activity
        for (const act of affectedActivities) {
            await connection.query(
                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [act.kegiatan_id, req.user.id, 'edit', `Lampiran "${doc.nama_file}" terhapus otomatis karena dokumen dihapus dari sistem.`]
            );
        }

        await connection.commit();
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
        let query = `
            SELECT 
                d.*, 
                j.dokumen as jenis_dokumen_nama, 
                pp.nama_lengkap as uploader_nama,
                pp.bidang_id as uploader_bidang_id,
                COALESCE(b.singkatan, b.nama_bidang) as uploader_bidang,
                GROUP_CONCAT(DISTINCT t.nama SEPARATOR ',') as tematik_names,
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
            WHERE d.is_deleted = 1
        `;
        let params = [];

        if (search) {
            query += ` AND (d.nama_file LIKE ? OR j.dokumen LIKE ?) `;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` GROUP BY d.id ORDER BY d.deleted_at DESC `;
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

const restore = async (req, res) => {
    try {
        const { id } = req.params;

        // Check exists in trash
        const [rows] = await pool.query('SELECT id FROM dokumen_upload WHERE id = ? AND is_deleted = 1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }

        await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);

        // Also restore associated surat if exists
        await pool.query('UPDATE surat SET is_deleted = 0, deleted_at = NULL WHERE dokumen_id = ?', [id]);

        // Record history
        await pool.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [id, req.user.id, 'restore', `Dokumen dipulihkan dari tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
        );

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

        // Delete from DB
        await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id = ?', [id]);
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ?', [id]);
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
        const { nama_file, jenis_dokumen_id, tematik_ids } = req.body;

        if (!nama_file || !jenis_dokumen_id) {
            return res.status(400).json({ success: false, message: 'Nama file dan jenis dokumen wajib diisi' });
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

        // Get old values for comparison
        const [oldDoc] = await connection.query('SELECT nama_file, jenis_dokumen_id FROM dokumen_upload WHERE id = ?', [id]);
        
        // Update main record
        await connection.query(
            'UPDATE dokumen_upload SET nama_file = ?, jenis_dokumen_id = ? WHERE id = ?',
            [nama_file, jenis_dokumen_id, id]
        );

        // Record history
        let changes = [];
        if (oldDoc[0].nama_file !== nama_file) changes.push(`Nama file diubah: "${oldDoc[0].nama_file}" -> "${nama_file}"`);
        if (oldDoc[0].jenis_dokumen_id !== parseInt(jenis_dokumen_id)) {
            const [jenisOld] = await connection.query('SELECT dokumen FROM master_dokumen WHERE id = ?', [oldDoc[0].jenis_dokumen_id]);
            const [jenisNew] = await connection.query('SELECT dokumen FROM master_dokumen WHERE id = ?', [jenis_dokumen_id]);
            changes.push(`Kategori diubah: "${jenisOld[0]?.dokumen || 'Unknown'}" -> "${jenisNew[0]?.dokumen || 'Unknown'}"`);
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

        // Logic similar to restore but for multiple IDs
        await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id IN (?) AND is_deleted = 1', [ids]);

        // Record history for all
        for (const id of ids) {
            await pool.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [id, req.user.id, 'restore', `Dokumen dipulihkan secara massal oleh ${req.user.nama_lengkap || 'User'}`]
            );
        }

        res.json({ success: true, message: `${ids.length} dokumen berhasil dipulihkan` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const bulkPermanentDelete = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { ids } = req.body;
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

        // Delete from DB
        await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id IN (?)', [foundIds]);
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id IN (?)', [foundIds]);
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
        const isAgencyLevel = [2, 5, 7, 8].includes(userRole);
        const isDivisionLevel = [4, 6, 9, 10].includes(userRole);

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
        } else if (isAgencyLevel) {
            query += ' AND pp.instansi_id = ?';
            params.push(req.user.instansi_id);
        } else if (isDivisionLevel) {
            query += ' AND pp.bidang_id = ?';
            params.push(req.user.bidang_id);
        } else {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk mengosongkan tempat sampah.' });
        }

        const [docs] = await connection.query(query, params);
        if (docs.length === 0) {
            await connection.rollback();
            return res.json({ success: true, message: 'Tempat sampah sudah kosong.' });
        }

        const ids = docs.map(d => d.id);
        const paths = docs.map(d => d.path);

        // 1. Cascading Cleanup for ALL IDs in trash
        for (const id of ids) {
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
        }

        // Unlink associations (bulk)
        await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id IN (?)', [ids]);

        // Delete from DB
        await connection.query('DELETE FROM dokumen_edit_history WHERE dokumen_id IN (?)', [ids]);
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id IN (?)', [ids]);
        await connection.query('DELETE FROM dokumen_upload WHERE id IN (?)', [ids]);

        // Delete files
        const fs = require('fs');
        const path = require('path');
        for (const filePath of paths) {
            const absolutePath = path.join(__dirname, '../..', filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        await connection.commit();
        res.json({ success: true, message: `Berhasil mengosongkan ${docs.length} dokumen dari tempat sampah.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
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
    emptyTrash
};
