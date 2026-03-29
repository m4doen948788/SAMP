const pool = require('../config/db');

// Get all satuan
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_satuan ORDER BY satuan ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get satuan by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_satuan WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create satuan
const create = async (req, res) => {
    try {
        const { satuan } = req.body;
        if (!satuan) {
            return res.status(400).json({ success: false, message: 'Nama satuan wajib diisi' });
        }
        const [result] = await pool.query('INSERT INTO master_satuan (satuan) VALUES (?)', [satuan]);
        res.status(201).json({ success: true, data: { id: result.insertId, satuan } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update satuan
const update = async (req, res) => {
    try {
        const { satuan } = req.body;
        if (!satuan) {
            return res.status(400).json({ success: false, message: 'Nama satuan wajib diisi' });
        }
        const [result] = await pool.query('UPDATE master_satuan SET satuan = ? WHERE id = ?', [satuan, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), satuan } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete satuan
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM master_satuan WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
