const pool = require('../config/db');

// Get all pangkat/golongan
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_pangkat_golongan ORDER BY id ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_pangkat_golongan WHERE id = ?', [req.params.id]);
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
        const { pangkat_golongan } = req.body;
        if (!pangkat_golongan) {
            return res.status(400).json({ success: false, message: 'Pangkat/Golongan wajib diisi' });
        }
        const [result] = await pool.query('INSERT INTO master_pangkat_golongan (pangkat_golongan) VALUES (?)', [pangkat_golongan]);
        res.status(201).json({ success: true, data: { id: result.insertId, pangkat_golongan } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update
const update = async (req, res) => {
    try {
        const { pangkat_golongan } = req.body;
        if (!pangkat_golongan) {
            return res.status(400).json({ success: false, message: 'Pangkat/Golongan wajib diisi' });
        }
        const [result] = await pool.query('UPDATE master_pangkat_golongan SET pangkat_golongan = ? WHERE id = ?', [pangkat_golongan, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), pangkat_golongan } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM master_pangkat_golongan WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sync Data (Simulated External Source)
const syncData = async (req, res) => {
    try {
        const standardRanks = [
            // PNS Ranks
            'I/a - Juru Muda', 'I/b - Juru Muda Tingkat I', 'I/c - Juru', 'I/d - Juru Tingkat I',
            'II/a - Pengatur Muda', 'II/b - Pengatur Muda Tingkat I', 'II/c - Pengatur', 'II/d - Pengatur Tingkat I',
            'III/a - Penata Muda', 'III/b - Penata Muda Tingkat I', 'III/c - Penata', 'III/d - Penata Tingkat I',
            'IV/a - Pembina', 'IV/b - Pembina Tingkat I', 'IV/c - Pembina Utama Muda', 'IV/d - Pembina Utama Madya', 'IV/e - Pembina Utama',
            // PPPK Ranks
            'PPPK - Golongan I', 'PPPK - Golongan II', 'PPPK - Golongan III', 'PPPK - Golongan IV',
            'PPPK - Golongan V', 'PPPK - Golongan VI', 'PPPK - Golongan VII', 'PPPK - Golongan VIII',
            'PPPK - Golongan IX', 'PPPK - Golongan X', 'PPPK - Golongan XI', 'PPPK - Golongan XII',
            'PPPK - Golongan XIII', 'PPPK - Golongan XIV', 'PPPK - Golongan XV', 'PPPK - Golongan XVI', 'PPPK - Golongan XVII'
        ];

        // Check existing data
        const [existing] = await pool.query('SELECT pangkat_golongan FROM master_pangkat_golongan');
        const existingRanks = new Set(existing.map(r => r.pangkat_golongan));

        let addedCount = 0;
        for (const rank of standardRanks) {
            if (!existingRanks.has(rank)) {
                await pool.query('INSERT INTO master_pangkat_golongan (pangkat_golongan) VALUES (?)', [rank]);
                addedCount++;
            }
        }

        res.json({ success: true, message: `Sinkronisasi selesai. Memasukkan ${addedCount} data baru.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal melakukan sinkronisasi: ' + err.message });
    }
};

module.exports = { getAll, getById, create, update, remove, syncData };
