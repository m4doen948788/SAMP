const pool = require('../../../config/db');

// Get all tahun
const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_tahun ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get tahun by ID
const getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_tahun WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create tahun
const create = async (req, res) => {
  try {
    const { nama } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }
    const [result] = await pool.query('INSERT INTO master_tahun (nama) VALUES (?)', [nama]);
    res.status(201).json({ success: true, data: { id: result.insertId, nama } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update tahun
const update = async (req, res) => {
  try {
    const { nama } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }
    const [result] = await pool.query('UPDATE master_tahun SET nama = ? WHERE id = ?', [nama, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: { id: parseInt(req.params.id), nama } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete tahun
const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM master_tahun WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
