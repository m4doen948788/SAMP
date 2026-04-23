const pool = require('../../../config/db');

// Get all mapping bidang urusan instansi
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.id as urusan_id, u.urusan as nama_urusan, 
                p.id as program_id, p.nama_program as nama_program,
                m.id, m.instansi_id, i.instansi as nama_instansi, i.singkatan as singkatan_instansi
            FROM master_bidang_urusan u
            LEFT JOIN master_program p ON u.id = p.urusan_id
            LEFT JOIN mapping_urusan_instansi m ON u.id = m.urusan_id AND (m.program_id = p.id OR (m.program_id IS NULL AND p.id IS NULL))
            LEFT JOIN master_instansi_daerah i ON m.instansi_id = i.id
            ORDER BY u.urusan ASC, p.nama_program ASC, i.instansi ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create mapping (Multi-selection support)
const create = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { urusan_id, program_id, instansi_ids } = req.body;

        if (!urusan_id || !instansi_ids || !Array.isArray(instansi_ids)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Urusan dan daftar Instansi wajib dipilih' });
        }

        if (instansi_ids.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Minimal pilih satu instansi' });
        }

        const [existing] = await connection.query(
            'SELECT instansi_id FROM mapping_urusan_instansi WHERE urusan_id = ? AND (program_id = ? OR (program_id IS NULL AND ? IS NULL))', 
            [urusan_id, program_id || null, program_id || null]
        );
        const existingIds = existing.map(e => e.instansi_id);
        const newIds = instansi_ids.filter(id => !existingIds.includes(Number(id)));

        if (newIds.length > 0) {
            const values = newIds.map(instansi_id => [urusan_id, program_id || null, instansi_id]);
            await connection.query('INSERT INTO mapping_urusan_instansi (urusan_id, program_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.status(201).json({ success: true, message: 'Mapping berhasil diproses' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Update mapping group (Syncing all instansi for an urusan + program group)
const update = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { urusan_id, program_id, instansi_ids } = req.body;

        if (!urusan_id) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'ID Bidang Urusan wajib diisi' });
        }

        if (!Array.isArray(instansi_ids)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Data instansi tidak valid' });
        }

        // Delete existing mappings for this specific group to sync
        await connection.query(
            'DELETE FROM mapping_urusan_instansi WHERE urusan_id = ? AND (program_id = ? OR (program_id IS NULL AND ? IS NULL))', 
            [urusan_id, program_id || null, program_id || null]
        );

        if (instansi_ids.length > 0) {
            const values = instansi_ids.map(instansi_id => [urusan_id, program_id || null, instansi_id]);
            await connection.query('INSERT INTO mapping_urusan_instansi (urusan_id, program_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Data mapping berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Delete mapping (Single row)
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM mapping_urusan_instansi WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, create, update, remove };
