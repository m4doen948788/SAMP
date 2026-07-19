const pool = require('../../../config/db');
const auditService = require('../../../utils/auditService');

const checkAccess = (req) => {
    if (!req.user) return false;
    if (req.user.tipe_user_id === 1) return true; // Super Admin
    
    const instansiNama = (req.user.instansi_nama || '').toLowerCase();
    const instansiSingkatan = (req.user.instansi_singkatan || '').toLowerCase();
    
    return instansiNama.includes('perencanaan') || 
           instansiNama.includes('bapperida') || 
           instansiNama.includes('bappeda') ||
           instansiSingkatan.includes('bapperida') ||
           instansiSingkatan.includes('bappeda');
};

const rpjpdController = {
    // ==========================================
    // VISI ENDPOINTS
    // ==========================================
    getVisi: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM rpjpd_visi ORDER BY tahun_mulai DESC');
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    saveVisi: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Bapperida atau Super Admin yang dapat mengubah data RPJPD.' });
        }
        try {
            const { id, tahun_mulai, tahun_selesai, visi, keterangan } = req.body;
            if (!tahun_mulai || !tahun_selesai || !visi) {
                return res.status(400).json({ success: false, message: 'Tahun mulai, tahun selesai, dan visi wajib diisi' });
            }

            if (id) {
                await pool.query(
                    'UPDATE rpjpd_visi SET tahun_mulai = ?, tahun_selesai = ?, visi = ?, keterangan = ? WHERE id = ?',
                    [tahun_mulai, tahun_selesai, visi, keterangan || null, id]
                );
                await auditService.log({
                    user_id: req.user.id,
                    action: 'UPDATE_RPJPD_VISI',
                    table_name: 'rpjpd_visi',
                    new_values: req.body,
                    req
                });
                res.json({ success: true, message: 'Visi RPJPD berhasil diperbarui' });
            } else {
                const [result] = await pool.query(
                    'INSERT INTO rpjpd_visi (tahun_mulai, tahun_selesai, visi, keterangan) VALUES (?, ?, ?, ?)',
                    [tahun_mulai, tahun_selesai, visi, keterangan || null]
                );
                await auditService.log({
                    user_id: req.user.id,
                    action: 'CREATE_RPJPD_VISI',
                    table_name: 'rpjpd_visi',
                    new_values: { id: result.insertId, ...req.body },
                    req
                });
                res.status(201).json({ success: true, message: 'Visi RPJPD berhasil ditambahkan', insertId: result.insertId });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ==========================================
    // MISI ENDPOINTS
    // ==========================================
    getMisi: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT m.*, v.visi as visi_nama 
                FROM rpjpd_misi m
                LEFT JOIN rpjpd_visi v ON m.visi_id = v.id
                ORDER BY v.tahun_mulai DESC, CAST(m.kode_misi AS UNSIGNED) ASC, m.kode_misi ASC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    saveMisi: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id, visi_id, kode_misi, misi } = req.body;
            if (!visi_id || !kode_misi || !misi) {
                return res.status(400).json({ success: false, message: 'Visi, kode misi, dan pernyataan misi wajib diisi' });
            }

            if (id) {
                await pool.query(
                    'UPDATE rpjpd_misi SET visi_id = ?, kode_misi = ?, misi = ? WHERE id = ?',
                    [visi_id, kode_misi, misi, id]
                );
                res.json({ success: true, message: 'Misi RPJPD berhasil diperbarui' });
            } else {
                await pool.query(
                    'INSERT INTO rpjpd_misi (visi_id, kode_misi, misi) VALUES (?, ?, ?)',
                    [visi_id, kode_misi, misi]
                );
                res.status(201).json({ success: true, message: 'Misi RPJPD berhasil ditambahkan' });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    deleteMisi: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM rpjpd_misi WHERE id = ?', [id]);
            res.json({ success: true, message: 'Misi RPJPD berhasil dihapus' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ==========================================
    // SASARAN ENDPOINTS
    // ==========================================
    getSasaran: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT s.*, m.misi as misi_nama, m.kode_misi
                FROM rpjpd_sasaran s
                LEFT JOIN rpjpd_misi m ON s.misi_id = m.id
                ORDER BY m.kode_misi ASC, s.kode_sasaran ASC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    saveSasaran: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id, misi_id, kode_sasaran, sasaran_pokok } = req.body;
            if (!misi_id || !kode_sasaran || !sasaran_pokok) {
                return res.status(400).json({ success: false, message: 'Misi, kode sasaran, dan sasaran pokok wajib diisi' });
            }

            if (id) {
                await pool.query(
                    'UPDATE rpjpd_sasaran SET misi_id = ?, kode_sasaran = ?, sasaran_pokok = ? WHERE id = ?',
                    [misi_id, kode_sasaran, sasaran_pokok, id]
                );
                res.json({ success: true, message: 'Sasaran Pokok berhasil diperbarui' });
            } else {
                await pool.query(
                    'INSERT INTO rpjpd_sasaran (misi_id, kode_sasaran, sasaran_pokok) VALUES (?, ?, ?)',
                    [misi_id, kode_sasaran, sasaran_pokok]
                );
                res.status(201).json({ success: true, message: 'Sasaran Pokok berhasil ditambahkan' });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    deleteSasaran: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM rpjpd_sasaran WHERE id = ?', [id]);
            res.json({ success: true, message: 'Sasaran Pokok berhasil dihapus' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ==========================================
    // ARAH KEBIJAKAN ENDPOINTS
    // ==========================================
    getArahKebijakan: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT ak.*, s.sasaran_pokok as sasaran_nama, s.kode_sasaran
                FROM rpjpd_arah_kebijakan ak
                LEFT JOIN rpjpd_sasaran s ON ak.sasaran_pokok_id = s.id
                ORDER BY s.kode_sasaran ASC, ak.kode_arah_kebijakan ASC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    saveArahKebijakan: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id, sasaran_pokok_id, kode_arah_kebijakan, arah_kebijakan } = req.body;
            if (!sasaran_pokok_id || !kode_arah_kebijakan || !arah_kebijakan) {
                return res.status(400).json({ success: false, message: 'Sasaran Pokok, kode arah kebijakan, dan arah kebijakan wajib diisi' });
            }

            if (id) {
                await pool.query(
                    'UPDATE rpjpd_arah_kebijakan SET sasaran_pokok_id = ?, kode_arah_kebijakan = ?, arah_kebijakan = ? WHERE id = ?',
                    [sasaran_pokok_id, kode_arah_kebijakan, arah_kebijakan, id]
                );
                res.json({ success: true, message: 'Arah Kebijakan berhasil diperbarui' });
            } else {
                await pool.query(
                    'INSERT INTO rpjpd_arah_kebijakan (sasaran_pokok_id, kode_arah_kebijakan, arah_kebijakan) VALUES (?, ?, ?)',
                    [sasaran_pokok_id, kode_arah_kebijakan, arah_kebijakan]
                );
                res.status(201).json({ success: true, message: 'Arah Kebijakan berhasil ditambahkan' });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    deleteArahKebijakan: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM rpjpd_arah_kebijakan WHERE id = ?', [id]);
            res.json({ success: true, message: 'Arah Kebijakan berhasil dihapus' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ==========================================
    // INDIKATOR ENDPOINTS
    // ==========================================
    getIndikator: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT ind.*, s.sasaran_pokok as sasaran_nama, s.kode_sasaran, sat.satuan as satuan_nama
                FROM rpjpd_indikator ind
                LEFT JOIN rpjpd_sasaran s ON ind.sasaran_pokok_id = s.id
                LEFT JOIN master_satuan sat ON ind.satuan_id = sat.id
                ORDER BY s.kode_sasaran ASC, ind.nama_indikator ASC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    saveIndikator: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { 
                id, 
                sasaran_pokok_id, 
                nama_indikator, 
                satuan_id, 
                kondisi_awal_nilai, 
                kondisi_awal_tahun, 
                target_tahap_1, 
                target_tahap_2, 
                target_tahap_3, 
                target_tahap_4, 
                keterangan 
            } = req.body;

            if (!sasaran_pokok_id || !nama_indikator) {
                return res.status(400).json({ success: false, message: 'Sasaran Pokok dan nama indikator wajib diisi' });
            }

            if (id) {
                await pool.query(`
                    UPDATE rpjpd_indikator 
                    SET sasaran_pokok_id = ?, 
                        nama_indikator = ?, 
                        satuan_id = ?, 
                        kondisi_awal_nilai = ?, 
                        kondisi_awal_tahun = ?, 
                        target_tahap_1 = ?, 
                        target_tahap_2 = ?, 
                        target_tahap_3 = ?, 
                        target_tahap_4 = ?, 
                        keterangan = ? 
                    WHERE id = ?`,
                    [
                        sasaran_pokok_id, 
                        nama_indikator, 
                        satuan_id || null, 
                        kondisi_awal_nilai !== undefined ? kondisi_awal_nilai : null, 
                        kondisi_awal_tahun || null, 
                        target_tahap_1 !== undefined ? target_tahap_1 : null, 
                        target_tahap_2 !== undefined ? target_tahap_2 : null, 
                        target_tahap_3 !== undefined ? target_tahap_3 : null, 
                        target_tahap_4 !== undefined ? target_tahap_4 : null, 
                        keterangan || null, 
                        id
                    ]
                );
                res.json({ success: true, message: 'Indikator RPJPD berhasil diperbarui' });
            } else {
                await pool.query(`
                    INSERT INTO rpjpd_indikator (
                        sasaran_pokok_id, 
                        nama_indikator, 
                        satuan_id, 
                        kondisi_awal_nilai, 
                        kondisi_awal_tahun, 
                        target_tahap_1, 
                        target_tahap_2, 
                        target_tahap_3, 
                        target_tahap_4, 
                        keterangan
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        sasaran_pokok_id, 
                        nama_indikator, 
                        satuan_id || null, 
                        kondisi_awal_nilai !== undefined ? kondisi_awal_nilai : null, 
                        kondisi_awal_tahun || null, 
                        target_tahap_1 !== undefined ? target_tahap_1 : null, 
                        target_tahap_2 !== undefined ? target_tahap_2 : null, 
                        target_tahap_3 !== undefined ? target_tahap_3 : null, 
                        target_tahap_4 !== undefined ? target_tahap_4 : null, 
                        keterangan || null
                    ]
                );
                res.status(201).json({ success: true, message: 'Indikator RPJPD berhasil ditambahkan' });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    deleteIndikator: async (req, res) => {
        if (!checkAccess(req)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM rpjpd_indikator WHERE id = ?', [id]);
            res.json({ success: true, message: 'Indikator RPJPD berhasil dihapus' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = rpjpdController;
