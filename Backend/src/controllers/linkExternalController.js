const pool = require('../config/db');

// Get all link external
const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_link_external WHERE deleted_at IS NULL ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get by ID
const getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_link_external WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create
const create = async (req, res) => {
  try {
    const { label, uri } = req.body;
    if (!label || !uri) {
      return res.status(400).json({ success: false, message: 'Label dan URI wajib diisi' });
    }
    const [result] = await pool.query(
      'INSERT INTO master_link_external (label, uri, created_by) VALUES (?, ?, ?)',
      [label, uri, 0] // Placeholder created_by: 0
    );
    res.status(201).json({ success: true, data: { id: result.insertId, label, uri } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { label, uri } = req.body;
    if (!label || !uri) {
      return res.status(400).json({ success: false, message: 'Label dan URI wajib diisi' });
    }
    const [result] = await pool.query(
      'UPDATE master_link_external SET label = ?, uri = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL',
      [label, uri, 0, req.params.id] // Placeholder updated_by: 0
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: { id: parseInt(req.params.id), label, uri } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Soft Delete (as required by fields deleted_at, deleted_by)
const remove = async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE master_link_external SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
      [0, req.params.id] // Placeholder deleted_by: 0
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
