const pool = require('../config/db');

// Get all status administrasi pegawai
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_status_administrasi_pegawai ORDER BY id ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll };
