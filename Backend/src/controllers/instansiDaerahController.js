const pool = require('../config/db');

// Get all instansi daerah
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM master_instansi_daerah 
            WHERE deleted_at IS NULL 
            ORDER BY 
                CASE 
                    WHEN instansi LIKE 'Sekretariat Daerah%' THEN 1
                    WHEN instansi LIKE 'Sekretariat%' THEN 2
                    WHEN instansi = 'Inspektorat' THEN 3
                    WHEN instansi LIKE 'Dinas%' THEN 4
                    WHEN instansi LIKE 'Badan%' THEN 5
                    WHEN instansi LIKE 'Kecamatan%' THEN 99
                    ELSE 10
                END, 
                instansi ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_instansi_daerah WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
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
        const { instansi, singkatan, kelas_instansi, kelompok_instansi } = req.body;
        if (!instansi) {
            return res.status(400).json({ success: false, message: 'Instansi wajib diisi' });
        }
        const [result] = await pool.query(
            'INSERT INTO master_instansi_daerah (instansi, singkatan, kelas_instansi, kelompok_instansi, created_by) VALUES (?, ?, ?, ?, ?)',
            [instansi, singkatan || null, kelas_instansi || null, kelompok_instansi || null, 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, instansi, singkatan, kelas_instansi, kelompok_instansi } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update
const update = async (req, res) => {
    try {
        const { instansi, singkatan, kelas_instansi, kelompok_instansi } = req.body;
        if (!instansi) {
            return res.status(400).json({ success: false, message: 'Instansi wajib diisi' });
        }
        const [result] = await pool.query(
            'UPDATE master_instansi_daerah SET instansi = ?, singkatan = ?, kelas_instansi = ?, kelompok_instansi = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL',
            [instansi, singkatan || null, kelas_instansi || null, kelompok_instansi || null, 0, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), instansi, singkatan, kelas_instansi, kelompok_instansi } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Soft Delete
const remove = async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE master_instansi_daerah SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
            [0, req.params.id]
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
