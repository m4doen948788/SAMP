const pool = require('../../../config/db');

// Get all bidang (join with instansi daerah)
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, i.instansi AS nama_instansi 
            FROM master_bidang b 
            LEFT JOIN master_instansi_daerah i ON b.instansi_id = i.id
            ORDER BY b.id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get bidang by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, i.instansi AS nama_instansi 
            FROM master_bidang b 
            LEFT JOIN master_instansi_daerah i ON b.instansi_id = i.id
            WHERE b.id = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create bidang
const create = async (req, res) => {
    try {
        const { nama_bidang, singkatan, instansi_id } = req.body;
        if (!nama_bidang) {
            return res.status(400).json({ success: false, message: 'Nama Bidang wajib diisi' });
        }
        const [result] = await pool.query(
            'INSERT INTO master_bidang (nama_bidang, singkatan, instansi_id) VALUES (?, ?, ?)',
            [nama_bidang, singkatan || null, instansi_id || null]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, nama_bidang, singkatan, instansi_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update bidang
const update = async (req, res) => {
    try {
        const { nama_bidang, singkatan, instansi_id } = req.body;
        if (!nama_bidang) {
            return res.status(400).json({ success: false, message: 'Nama Bidang wajib diisi' });
        }
        const [result] = await pool.query(
            'UPDATE master_bidang SET nama_bidang = ?, singkatan = ?, instansi_id = ? WHERE id = ?',
            [nama_bidang, singkatan || null, instansi_id || null, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), nama_bidang, singkatan, instansi_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete bidang
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM master_bidang WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
