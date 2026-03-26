const pool = require('../config/db');

const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM buku_referensi ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { judul, konten, is_superadmin_only } = req.body;
        const [result] = await pool.query('INSERT INTO buku_referensi (judul, konten, is_superadmin_only) VALUES (?, ?, ?)', [judul, konten, is_superadmin_only || false]);
        res.json({ success: true, data: { id: result.insertId, judul, konten, is_superadmin_only } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, konten, is_superadmin_only } = req.body;
        await pool.query('UPDATE buku_referensi SET judul = ?, konten = ?, is_superadmin_only = ? WHERE id = ?', [judul, konten, is_superadmin_only, id]);
        res.json({ success: true, message: 'Data updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM buku_referensi WHERE id = ?', [id]);
        res.json({ success: true, message: 'Data deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, create, update, remove };
