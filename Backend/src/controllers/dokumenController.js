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
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
}).single('file');

// Middleware to handle upload
const uploadFile = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ success: false, message: 'Unknown upload error: ' + err.message });
        }
        next();
    });
};

// Process the uploaded file
const processUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
        }

        const { jenis_dokumen_id } = req.body;
        if (!jenis_dokumen_id) {
            return res.status(400).json({ success: false, message: 'Jenis dokumen wajib dipilih' });
        }

        const nama_file = req.file.originalname;
        const filePath = '/uploads/' + req.file.filename;
        const ukuran = req.file.size;

        // Assuming user ID is available from auth middleware
        const uploaded_by = req.user ? req.user.id : null;

        const [result] = await pool.query(
            'INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by) VALUES (?, ?, ?, ?, ?)',
            [nama_file, filePath, ukuran, jenis_dokumen_id, uploaded_by]
        );

        res.status(201).json({
            success: true,
            message: 'File berhasil diupload',
            data: {
                id: result.insertId,
                nama_file,
                path: filePath
            }
        });
    } catch (err) {
        // Cleanup file if DB insert fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

const getAll = async (req, res) => {
    try {
        const query = `
            SELECT d.*, j.nama as jenis_dokumen_nama, pp.nama_lengkap as uploader_nama 
            FROM dokumen_upload d
            LEFT JOIN master_jenis_dokumen j ON d.jenis_dokumen_id = j.id
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
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

        // Get file path first
        const [rows] = await pool.query('SELECT path FROM dokumen_upload WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
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

module.exports = { uploadFile, processUpload, getAll, remove };
