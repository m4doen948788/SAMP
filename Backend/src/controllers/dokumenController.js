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

        // Save tematik tags if provided
        let { tematik_ids } = req.body;
        if (tematik_ids) {
            // Handle both array and comma-separated string
            const tags = Array.isArray(tematik_ids) 
                ? tematik_ids 
                : String(tematik_ids).split(',').map(s => s.trim()).filter(Boolean);
            
            for (const tId of tags) {
                await pool.query('INSERT INTO dokumen_tematik (dokumen_id, tematik_id) VALUES (?, ?)', [newDocId, tId]);
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
                j.nama as jenis_dokumen_nama, 
                pp.nama_lengkap as uploader_nama,
                pp.bidang_id as uploader_bidang_id,
                COALESCE(b.singkatan, b.nama_bidang) as uploader_bidang,
                GROUP_CONCAT(t.nama SEPARATOR ',') as tematik_names
            FROM dokumen_upload d
            LEFT JOIN master_jenis_dokumen j ON d.jenis_dokumen_id = j.id
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            LEFT JOIN master_bidang_instansi b ON pp.bidang_id = b.id
            LEFT JOIN dokumen_tematik dt ON d.id = dt.dokumen_id
            LEFT JOIN master_tematik t ON dt.tematik_id = t.id
            GROUP BY d.id
            ORDER BY d.uploaded_at DESC
        `;
        const [rows] = await pool.query(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;

        // Check permission and get info
        const [rows] = await pool.query(`
            SELECT d.path, d.uploaded_by, pp.bidang_id as uploader_bidang_id 
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
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk menghapus dokumen ini.' });
        }

        const filePath = rows[0].path;

        // Delete from DB
        const [result] = await pool.query('DELETE FROM dokumen_upload WHERE id = ?', [id]);

        // Delete actual file
        if (result.affectedRows > 0) {
            const absolutePath = path.join(__dirname, '../..', filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        res.json({ success: true, message: 'File berhasil dihapus' });
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

        // Update main record
        await connection.query(
            'UPDATE dokumen_upload SET nama_file = ?, jenis_dokumen_id = ? WHERE id = ?',
            [nama_file, jenis_dokumen_id, id]
        );

        // Update tematik tags
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ?', [id]);
        
        if (tematik_ids) {
            const tags = Array.isArray(tematik_ids) 
                ? tematik_ids 
                : String(tematik_ids).split(',').map(s => s.trim()).filter(Boolean);
            
            for (const tId of tags) {
                await connection.query('INSERT INTO dokumen_tematik (dokumen_id, tematik_id) VALUES (?, ?)', [id, tId]);
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

module.exports = { uploadFile, processUpload, getAll, remove, update };
