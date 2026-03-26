const pool = require('../config/db');

// Get all jenis pegawai
const getAll = async (req, res) => {
    try {
        const query = `
            SELECT p.*, s.administrasi_pegawai 
            FROM master_jenis_pegawai p
            LEFT JOIN master_status_administrasi_pegawai s ON p.status_administrasi_id = s.id
            ORDER BY p.id DESC
        `;
        const [rows] = await pool.query(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get jenis pegawai by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_jenis_pegawai WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create jenis pegawai
const create = async (req, res) => {
    try {
        const { nama, status_administrasi_id } = req.body;
        if (!nama) {
            return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
        }
        const stId = status_administrasi_id || null;
        const [result] = await pool.query(
            'INSERT INTO master_jenis_pegawai (nama, status_administrasi_id) VALUES (?, ?)',
            [nama, stId]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, nama, status_administrasi_id: stId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update jenis pegawai
const update = async (req, res) => {
    try {
        const { nama, status_administrasi_id } = req.body;
        if (!nama) {
            return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
        }
        const stId = status_administrasi_id || null;
        const [result] = await pool.query(
            'UPDATE master_jenis_pegawai SET nama = ?, status_administrasi_id = ? WHERE id = ?',
            [nama, stId, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), nama, status_administrasi_id: stId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete jenis pegawai
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM master_jenis_pegawai WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
