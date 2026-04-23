const pool = require('../../../config/db');

// Get all bidang urusan
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_bidang_urusan ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get bidang urusan by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_bidang_urusan WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create bidang urusan
const create = async (req, res) => {
    try {
        const { urusan, kode_urusan, parent_id } = req.body;
        if (!urusan) {
            return res.status(400).json({ success: false, message: 'Nama bidang urusan wajib diisi' });
        }
        const [result] = await pool.query('INSERT INTO master_bidang_urusan (urusan, kode_urusan, parent_id) VALUES (?, ?, ?)', [urusan, kode_urusan, parent_id || null]);
        res.status(201).json({ success: true, data: { id: result.insertId, urusan, kode_urusan, parent_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update bidang urusan
const update = async (req, res) => {
    try {
        const { urusan, kode_urusan, parent_id } = req.body;
        if (!urusan) {
            return res.status(400).json({ success: false, message: 'Nama bidang urusan wajib diisi' });
        }
        const [result] = await pool.query('UPDATE master_bidang_urusan SET urusan = ?, kode_urusan = ?, parent_id = ? WHERE id = ?', [urusan, kode_urusan, parent_id || null, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), urusan, kode_urusan, parent_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete bidang urusan
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM master_bidang_urusan WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
