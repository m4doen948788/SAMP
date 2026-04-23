const pool = require('../../../config/db');

// Get all bidang pengampu mappings
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mbp.*, 
                   i.instansi as nama_instansi,
                   i.singkatan as singkatan_instansi,
                   bi.nama_bidang as nama_bidang_pengampu,
                   bi.singkatan as singkatan_bidang,
                   'Badan Perencanaan Pembangunan dan Riset Daerah' as nama_koordinator
            FROM mapping_bidang_pengampu mbp
            JOIN master_instansi_daerah i ON mbp.instansi_id = i.id
            JOIN master_bidang_instansi bi ON mbp.bidang_instansi_id = bi.id
            ORDER BY i.instansi ASC, bi.nama_bidang ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create mapping bidang pengampu (Planning layer - strictly Bapperida)
const create = async (req, res) => {
    try {
        const { instansi_id, bidang_instansi_id } = req.body;
        if (!instansi_id || !bidang_instansi_id) {
            return res.status(400).json({ success: false, message: 'Instansi dan Bidang Bapperida wajib dipilih' });
        }

        // Check if mapping already exists
        const [existing] = await pool.query('SELECT id FROM mapping_bidang_pengampu WHERE instansi_id = ?', [instansi_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Instansi ini sudah dimapping ke bidang lain' });
        }

        const [result] = await pool.query('INSERT INTO mapping_bidang_pengampu (instansi_id, bidang_instansi_id) VALUES (?, ?)', [instansi_id, bidang_instansi_id]);

        res.status(201).json({ success: true, data: { id: result.insertId, instansi_id, bidang_instansi_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete mapping bidang pengampu
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM mapping_bidang_pengampu WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update mapping bidang pengampu
const update = async (req, res) => {
    try {
        const { instansi_id, bidang_instansi_id } = req.body;
        const { id } = req.params;

        if (!instansi_id || !bidang_instansi_id) {
            return res.status(400).json({ success: false, message: 'Instansi dan Bidang Bapperida wajib dipilih' });
        }

        // Check if another mapping with same instansi exists
        const [existing] = await pool.query('SELECT id FROM mapping_bidang_pengampu WHERE instansi_id = ? AND id != ?', [instansi_id, id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Instansi ini sudah dimapping ke bidang lain' });
        }

        const [result] = await pool.query('UPDATE mapping_bidang_pengampu SET instansi_id = ?, bidang_instansi_id = ? WHERE id = ?', [instansi_id, bidang_instansi_id, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        res.json({ success: true, message: 'Data berhasil diubah' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, create, update, remove };
