const pool = require('../config/db');

const tipeKegiatanController = {
    getAll: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM master_tipe_kegiatan ORDER BY urutan ASC, kode ASC');
            // Structure into parents and children
            const parents = rows.filter(r => !r.parent_id);
            const children = rows.filter(r => r.parent_id);

            const structured = parents.map(p => ({
                ...p,
                subOptions: children.filter(c => c.parent_id === p.id)
            }));

            res.json({ success: true, data: structured, raw: rows });
        } catch (err) {
            console.error('Error fetching tipe kegiatan:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM master_tipe_kegiatan WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const { kode, nama, deskripsi, warna, warna_teks, is_jumlah_full, is_rapat, urutan, parent_id } = req.body;
            if (!kode || !nama) {
                return res.status(400).json({ success: false, message: 'Kode dan Nama wajib diisi' });
            }
            const [result] = await pool.query(
                'INSERT INTO master_tipe_kegiatan (kode, nama, deskripsi, warna, warna_teks, is_jumlah_full, is_rapat, urutan, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [kode, nama, deskripsi, warna, warna_teks, is_jumlah_full, is_rapat, urutan, parent_id]
            );
            res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const { kode, nama, deskripsi, warna, warna_teks, is_jumlah_full, is_rapat, urutan, parent_id } = req.body;
            const [result] = await pool.query(
                'UPDATE master_tipe_kegiatan SET kode = ?, nama = ?, deskripsi = ?, warna = ?, warna_teks = ?, is_jumlah_full = ?, is_rapat = ?, urutan = ?, parent_id = ? WHERE id = ?',
                [kode, nama, deskripsi, warna, warna_teks, is_jumlah_full, is_rapat, urutan, parent_id, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
            }
            res.json({ success: true, data: { id: parseInt(req.params.id), ...req.body } });
        } catch (err) {
            console.error('Update error:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    remove: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM master_tipe_kegiatan WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
            }
            res.json({ success: true, message: 'Data berhasil dihapus' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = tipeKegiatanController;
