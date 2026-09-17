const pool = require('../../../config/db');

// Get all sub_bidang
const getAll = async (req, res) => {
    try {
        let query = `
            SELECT s.*, b.nama_bidang, b.instansi_id, i.instansi as nama_instansi, ts.nama_tipe as nama_tipe_sub_bidang
            FROM master_sub_bidang_instansi s
            JOIN master_bidang_instansi b ON s.bidang_instansi_id = b.id
            LEFT JOIN master_instansi_daerah i ON b.instansi_id = i.id
            LEFT JOIN master_tipe_sub_bidang ts ON s.tipe_sub_bidang_id = ts.id
        `;
        let queryParams = [];

        if (req.user.tipe_user_id !== 1 && req.user.instansi_id !== 1) {
            query += ` WHERE b.instansi_id = ? `;
            queryParams.push(req.user.instansi_id);
        }

        query += ` ORDER BY s.id DESC`;

        const [rows] = await pool.query(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get sub_bidang by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, b.nama_bidang, b.instansi_id, ts.nama_tipe as nama_tipe_sub_bidang
            FROM master_sub_bidang_instansi s 
            JOIN master_bidang_instansi b ON s.bidang_instansi_id = b.id
            LEFT JOIN master_tipe_sub_bidang ts ON s.tipe_sub_bidang_id = ts.id
            WHERE s.id = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create sub_bidang
const create = async (req, res) => {
    try {
        const { nama_sub_bidang, singkatan, bidang_instansi_id, tipe_sub_bidang_id } = req.body;
        if (!nama_sub_bidang || !bidang_instansi_id) {
            return res.status(400).json({ success: false, message: 'Nama Sub Bidang dan Bidang Induk wajib diisi' });
        }
        const insertTipeId = tipe_sub_bidang_id || 1;
        const [result] = await pool.query(
            'INSERT INTO master_sub_bidang_instansi (nama_sub_bidang, singkatan, bidang_instansi_id, tipe_sub_bidang_id) VALUES (?, ?, ?, ?)',
            [nama_sub_bidang, singkatan || null, bidang_instansi_id, insertTipeId]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, nama_sub_bidang, singkatan, bidang_instansi_id, tipe_sub_bidang_id: insertTipeId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update sub_bidang
const update = async (req, res) => {
    try {
        const { nama_sub_bidang, singkatan, bidang_instansi_id, tipe_sub_bidang_id } = req.body;
        if (!nama_sub_bidang || !bidang_instansi_id) {
            return res.status(400).json({ success: false, message: 'Nama Sub Bidang dan Bidang Induk wajib diisi' });
        }
        const [result] = await pool.query(
            'UPDATE master_sub_bidang_instansi SET nama_sub_bidang = ?, singkatan = ?, bidang_instansi_id = ?, tipe_sub_bidang_id = COALESCE(?, tipe_sub_bidang_id) WHERE id = ?',
            [nama_sub_bidang, singkatan || null, bidang_instansi_id, tipe_sub_bidang_id || null, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), nama_sub_bidang, singkatan, bidang_instansi_id, tipe_sub_bidang_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete sub_bidang
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM master_sub_bidang_instansi WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
