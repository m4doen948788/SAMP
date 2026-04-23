const pool = require('../../../config/db');

const wilayahController = {
    // Get all provinsi
    getProvinsi: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT id, nama FROM master_provinsi ORDER BY nama');
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Get kota/kabupaten by provinsi_id
    getKotaByProvinsi: async (req, res) => {
        try {
            const { provinsiId } = req.params;
            const [rows] = await pool.query(
                'SELECT id, nama FROM master_kota_kabupaten WHERE provinsi_id = ? ORDER BY nama',
                [provinsiId]
            );
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Get ALL kota/kabupaten (for tempat lahir searchable dropdown)
    getAllKota: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT k.id, k.nama, k.provinsi_id, p.nama as provinsi_nama
                FROM master_kota_kabupaten k
                LEFT JOIN master_provinsi p ON k.provinsi_id = p.id
                ORDER BY k.nama
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Get kecamatan by kota_kabupaten_id
    getKecamatanByKota: async (req, res) => {
        try {
            const { kotaId } = req.params;
            const [rows] = await pool.query(
                'SELECT id, nama FROM master_kecamatan WHERE kota_kabupaten_id = ? ORDER BY nama',
                [kotaId]
            );
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Get kelurahan by kecamatan_id
    getKelurahanByKecamatan: async (req, res) => {
        try {
            const { kecamatanId } = req.params;
            const [rows] = await pool.query(
                'SELECT id, nama FROM master_kelurahan WHERE kecamatan_id = ? ORDER BY nama',
                [kecamatanId]
            );
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = wilayahController;
