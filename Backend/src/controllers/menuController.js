const pool = require('../config/db');

// Get all menu with aplikasi external info
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT m.*, a.nama_aplikasi, a.url AS aplikasi_url
      FROM kelola_menu m
      LEFT JOIN master_aplikasi_external a ON m.aplikasi_external_id = a.id AND a.deleted_at IS NULL
      ORDER BY m.urutan ASC, m.id ASC
    `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get menu by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT m.*, a.nama_aplikasi, a.url AS aplikasi_url
      FROM kelola_menu m
      LEFT JOIN master_aplikasi_external a ON m.aplikasi_external_id = a.id AND a.deleted_at IS NULL
      WHERE m.id = ?
    `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create menu
const create = async (req, res) => {
    try {
        const { nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active } = req.body;
        if (!nama_menu) {
            return res.status(400).json({ success: false, message: 'Nama menu wajib diisi' });
        }
        const [result] = await pool.query(
            'INSERT INTO kelola_menu (nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nama_menu, tipe || 'menu1', aplikasi_external_id || null, action_page || null, icon || null, parent_id || null, urutan || 0, is_active !== undefined ? is_active : 1]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update menu
const update = async (req, res) => {
    try {
        const { nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active } = req.body;
        if (!nama_menu) {
            return res.status(400).json({ success: false, message: 'Nama menu wajib diisi' });
        }
        const [result] = await pool.query(
            'UPDATE kelola_menu SET nama_menu = ?, tipe = ?, aplikasi_external_id = ?, action_page = ?, icon = ?, parent_id = ?, urutan = ?, is_active = ? WHERE id = ?',
            [nama_menu, tipe || 'menu1', aplikasi_external_id || null, action_page || null, icon || null, parent_id || null, urutan || 0, is_active !== undefined ? is_active : 1, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete menu
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM kelola_menu WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Batch reorder menus
const reorder = async (req, res) => {
    try {
        const { items } = req.body; // [{id, urutan}, ...]
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Items array wajib diisi' });
        }
        for (const item of items) {
            await pool.query('UPDATE kelola_menu SET urutan = ? WHERE id = ?', [item.urutan, item.id]);
        }
        res.json({ success: true, message: 'Urutan berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove, reorder };
