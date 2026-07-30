const pool = require('../../../config/db');

// Get all tipe link (master_link)
const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, jenis_link, jenis_link AS nama FROM master_link WHERE deleted_at IS NULL ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get by ID
const getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, jenis_link, jenis_link AS nama FROM master_link WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
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
    const { jenis_link, nama } = req.body;
    const finalVal = (jenis_link || nama || '').trim();
    if (!finalVal) {
      return res.status(400).json({ success: false, message: 'Jenis link / nama tipe link wajib diisi' });
    }
    const [result] = await pool.query(
      'INSERT INTO master_link (jenis_link) VALUES (?)',
      [finalVal]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, jenis_link: finalVal, nama: finalVal } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { jenis_link, nama } = req.body;
    const finalVal = (jenis_link || nama || '').trim();
    if (!finalVal) {
      return res.status(400).json({ success: false, message: 'Jenis link / nama tipe link wajib diisi' });
    }
    const [result] = await pool.query(
      'UPDATE master_link SET jenis_link = ? WHERE id = ? AND deleted_at IS NULL',
      [finalVal, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: { id: parseInt(req.params.id), jenis_link: finalVal, nama: finalVal } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Soft Delete
const remove = async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE master_link SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
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
