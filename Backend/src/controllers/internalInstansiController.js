const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Logo Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (JPG, PNG, WEBP, SVG) yang diperbolehkan!'));
        }
    }
}).single('logo');

// Get hierarchical view of internal instansi
const getInternalInstansi = async (req, res) => {
    try {
        const { instansi_id } = req.params;

        const [pegawai] = await pool.query(`
            SELECT 
                p.id as id,
                p.id as profil_id,
                p.nama_lengkap,
                p.foto_profil,
                j.id as jabatan_id,
                j.jabatan,
                b.id as bidang_id,
                b.nama_bidang,
                COALESCE(psb.sub_bidang_id, p.sub_bidang_id) as sub_bidang_id,
                s.nama_sub_bidang
            FROM profil_pegawai p
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            LEFT JOIN profil_pegawai_sub_bidang psb ON p.id = psb.profil_pegawai_id
            LEFT JOIN master_sub_bidang_instansi s ON COALESCE(psb.sub_bidang_id, p.sub_bidang_id) = s.id
            WHERE p.instansi_id = ? AND p.is_active = 1
            ORDER BY 
                CASE 
                    WHEN j.jabatan LIKE 'Kepala Bidang%' OR j.jabatan LIKE 'Kepala Bagian%' THEN 1
                    WHEN j.jabatan LIKE 'Kepala Sub%' OR j.jabatan LIKE 'Kepala Seksi%' THEN 2
                    WHEN j.jabatan LIKE '%Ketua Tim%' THEN 3
                    ELSE 4
                END ASC,
                p.nama_lengkap ASC
        `, [instansi_id]);

        const [instansiData] = await pool.query('SELECT id, instansi, singkatan, tupoksi, alamat, kode_pos, alamat_web, telepon_kop, faks_kop, email_kop, website_kop, nama_instansi_kop, logo_kop_path FROM master_instansi_daerah WHERE id = ?', [instansi_id]);
        const [masterBidang] = await pool.query('SELECT id, nama_bidang FROM master_bidang_instansi WHERE instansi_id = ? ORDER BY id ASC', [instansi_id]);
        const [masterSubBidang] = await pool.query(`
            SELECT s.id, s.nama_sub_bidang, s.bidang_instansi_id 
            FROM master_sub_bidang_instansi s
            JOIN master_bidang_instansi b ON s.bidang_instansi_id = b.id
            WHERE b.instansi_id = ? 
            ORDER BY s.id ASC
        `, [instansi_id]);

        // Process 'pegawai' into a nested array format or grouped format
        // Kepala Badan / Dinas (jabatan_id: 8, 5, 9)
        const kepala = pegawai.filter(p => [8, 5, 9, 6].includes(p.jabatan_id) || (p.jabatan && p.jabatan.match(/kepala (badan|dinas)|direktur/i)));

        // Sekretaris (jabatan_id: 7, 10, 11)
        const sekretaris = pegawai.filter(p => [7, 10, 11].includes(p.jabatan_id) || (p.jabatan && p.jabatan.match(/sekretaris|wakil direktur/i)));

        // Group by bidang using master data first
        const bidangMap = new Map();
        masterBidang.forEach(b => {
            bidangMap.set(b.id, {
                id: b.id,
                nama_bidang: b.nama_bidang,
                kepala_bidang: [],
                sub_bidang: new Map(),
                staf: []
            });
        });

        masterSubBidang.forEach(sb => {
            if (bidangMap.has(sb.bidang_instansi_id)) {
                const b = bidangMap.get(sb.bidang_instansi_id);
                b.sub_bidang.set(sb.id, {
                    id: sb.id,
                    nama_sub_bidang: sb.nama_sub_bidang,
                    kepala_sub: [],
                    staf: []
                });
            }
        });

        // Other non-bidang staf?
        const lainnya = [];

        pegawai.forEach(p => {
            if (kepala.includes(p) || sekretaris.includes(p)) return;

            if (p.bidang_id && bidangMap.has(p.bidang_id)) {
                const b = bidangMap.get(p.bidang_id);
                // Check if Kabid (12 = Kepala Bidang, 13 = Kepala Bagian)
                if ([12, 13].includes(p.jabatan_id) || (p.jabatan && p.jabatan.match(/kepala (bidang|bagian)/i))) {
                    b.kepala_bidang.push(p);
                }
                // Check if has sub_bidang
                else if (p.sub_bidang_id && b.sub_bidang.has(p.sub_bidang_id)) {
                    const sb = b.sub_bidang.get(p.sub_bidang_id);
                    // Check if Kasubbag/Kasi (16 = Kasubbag, 18 = Kasi) or Ketua Tim (has "Ketua Tim" in title)
                    if ([16, 18].includes(p.jabatan_id) || (p.jabatan && p.jabatan.match(/kepala (sub|seksi)|ketua tim/i))) {
                        sb.kepala_sub.push(p);
                    } else {
                        sb.staf.push(p);
                    }
                }
                else {
                    b.staf.push(p);
                }
            } else {
                lainnya.push(p);
            }
        });

        // Convert Map to Array
        const bidangArray = Array.from(bidangMap.values()).map(b => ({
            ...b,
            sub_bidang: Array.from(b.sub_bidang.values())
        }));

        const result = {
            instansiDetail: instansiData.length > 0 ? instansiData[0] : null,
            kepala,
            sekretaris,
            bidang: bidangArray,
            lainnya
        };

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update profil instansi
const updateProfilInstansi = async (req, res) => {
    try {
        const { instansi_id } = req.params;
        const { tupoksi, alamat, kode_pos, alamat_web, telepon_kop, faks_kop, email_kop, website_kop, nama_instansi_kop } = req.body;

        // Authorization Check:
        // Superadmin (1) can edit any instansi.
        // Admin Instansi (2) and Admin Bapperida (8) can only edit their own instansi.
        const isSuperAdmin = Number(req.user.tipe_user_id) === 1;
        const tipeUserNama = (req.user.tipe_user_nama || '').toLowerCase();
        const isAdminInstansi = tipeUserNama.includes('admin instansi') || Number(req.user.tipe_user_id) === 2;
        const isAdminBapperida = tipeUserNama.includes('admin bapperida') || Number(req.user.tipe_user_id) === 8;
        const isOwnInstansi = Number(req.user.instansi_id) === Number(instansi_id);

        if (!isSuperAdmin) {
            if (!(isAdminInstansi || isAdminBapperida) || !isOwnInstansi) {
                console.log('Update Profil Instansi Denied:', {
                    tipe_user_id: req.user.tipe_user_id,
                    tipe_user_nama: req.user.tipe_user_nama,
                    user_instansi_id: req.user.instansi_id,
                    target_instansi_id: instansi_id,
                    isSuperAdmin,
                    isAdminInstansi,
                    isAdminBapperida,
                    isOwnInstansi
                });
                return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin untuk mengedit profil instansi ini' });
            }
        }

        const [result] = await pool.query(
            `UPDATE master_instansi_daerah SET 
                tupoksi = ?, 
                alamat = ?, 
                kode_pos = ?,
                alamat_web = ?, 
                telepon_kop = ?, 
                faks_kop = ?, 
                email_kop = ?, 
                website_kop = ?, 
                nama_instansi_kop = ? 
            WHERE id = ?`,
            [
                tupoksi || null, 
                alamat || null, 
                kode_pos || null,
                alamat_web || null, 
                telepon_kop || null, 
                faks_kop || null, 
                email_kop || null, 
                website_kop || null, 
                nama_instansi_kop || null, 
                instansi_id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Instansi tidak ditemukan' });
        }
        res.json({ success: true, message: 'Profil instansi berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const uploadLogo = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
        }

        const { instansi_id } = req.params;
        const logoPath = '/uploads/logos/' + req.file.filename;

        try {
            // Update database
            await pool.query(
                'UPDATE master_instansi_daerah SET logo_kop_path = ? WHERE id = ?',
                [logoPath, instansi_id]
            );

            res.json({
                success: true,
                message: 'Logo berhasil diunggah',
                path: logoPath
            });
        } catch (error) {
            console.error('Error uploading logo:', error);
            res.status(500).json({ success: false, message: 'Gagal memperbarui database logo' });
        }
    });
};

module.exports = { getInternalInstansi, updateProfilInstansi, uploadLogo };
