const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

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
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF dan Gambar yang diperbolehkan!'));
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

        const nama_file = custom_nama || req.file.originalname;
        const filePath = '/uploads/' + req.file.filename;
        const ukuran = req.file.size;

        // Assuming user ID is available from auth middleware
        const uploaded_by = req.user ? req.user.id : null;

        const [result] = await pool.query(
            'INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by) VALUES (?, ?, ?, ?, ?)',
            [nama_file, filePath, ukuran, jenis_dokumen_id, uploaded_by]
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
                nama_file,
                path: filePath
            }
        });
    } catch (err) {
        // Cleanup file and record if DB insert or tagging fails
        if (req.file) {
            const fs = require('fs');
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
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
                            'user_nama', u_h.nama_lengkap
                        )
                    )
                    FROM dokumen_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
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
    try {
        const { id } = req.params;

        // Check permission and get info
        const [rows] = await pool.query(`
            SELECT d.nama_file, d.uploaded_by, pp.bidang_id as uploader_bidang_id 
            FROM dokumen_upload d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE d.id = ? AND d.is_deleted = 0
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
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk menghapus dokumen ini.' });
        }

        // Soft Delete: Mark as deleted and set timestamp
        await pool.query('UPDATE dokumen_upload SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [id]);

        // Record history
        await pool.query(
            'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [id, req.user.id, 'delete', `Dokumen dipindahkan ke tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
        );

        res.json({ success: true, message: 'Dokumen dipindahkan ke tempat sampah' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getTrash = async (req, res) => {
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
                            'user_nama', u_h.nama_lengkap
                        )
                    )
                    FROM dokumen_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
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
            GROUP BY d.id
            ORDER BY d.deleted_at DESC
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

const restore = async (req, res) => {
    try {
        const { id } = req.params;

        // Check exists in trash
        const [rows] = await pool.query('SELECT id FROM dokumen_upload WHERE id = ? AND is_deleted = 1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }

        await pool.query('UPDATE dokumen_upload SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);

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
    try {
        const { id } = req.params;

        const [rows] = await pool.query('SELECT path FROM dokumen_upload WHERE id = ? AND is_deleted = 1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }

        const filePath = rows[0].path;

        // Delete from DB (cascaded history will be deleted if set, otherwise manual cleanup)
        // Assume CASCADE is set or we delete manually
        await pool.query('DELETE FROM dokumen_edit_history WHERE dokumen_id = ?', [id]);
        await pool.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ?', [id]);
        const [result] = await pool.query('DELETE FROM dokumen_upload WHERE id = ?', [id]);

        // Delete file from disk
        if (result.affectedRows > 0) {
            const absolutePath = path.join(__dirname, '../..', filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        res.json({ success: true, message: 'Dokumen dihapus secara permanen' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Daftar ID tidak valid' });
        }

        const [rows] = await pool.query('SELECT id, path FROM dokumen_upload WHERE id IN (?) AND is_deleted = 1', [ids]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di tempat sampah' });
        }

        const foundIds = rows.map(r => r.id);
        const paths = rows.map(r => r.path);

        // Delete from DB (CASCADE should handle history/tematik if defined, else manual)
        await pool.query('DELETE FROM dokumen_edit_history WHERE dokumen_id IN (?)', [foundIds]);
        await pool.query('DELETE FROM dokumen_tematik WHERE dokumen_id IN (?)', [foundIds]);
        const [result] = await pool.query('DELETE FROM dokumen_upload WHERE id IN (?)', [foundIds]);

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

        res.json({ success: true, message: `${foundIds.length} dokumen berhasil dihapus secara permanen` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const emptyTrash = async (req, res) => {
    try {
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
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk mengosongkan tempat sampah.' });
        }

        const [docs] = await pool.query(query, params);
        if (docs.length === 0) {
            return res.json({ success: true, message: 'Tempat sampah sudah kosong.' });
        }

        const ids = docs.map(d => d.id);
        const paths = docs.map(d => d.path);

        // Delete from DB
        await pool.query('DELETE FROM dokumen_edit_history WHERE dokumen_id IN (?)', [ids]);
        await pool.query('DELETE FROM dokumen_tematik WHERE dokumen_id IN (?)', [ids]);
        await pool.query('DELETE FROM dokumen_upload WHERE id IN (?)', [ids]);

        // Delete files
        const fs = require('fs');
        const path = require('path');
        for (const filePath of paths) {
            const absolutePath = path.join(__dirname, '../..', filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        res.json({ success: true, message: `Berhasil mengosongkan ${docs.length} dokumen dari tempat sampah.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
