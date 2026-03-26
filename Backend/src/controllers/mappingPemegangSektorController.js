const pool = require('../config/db');

// Get all employees and their mapped instances (sector holders)
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.id as pegawai_id, p.nama_lengkap, p.bidang_id, b.nama_bidang,
                m.instansi_id, i.instansi as nama_instansi, i.singkatan as singkatan_instansi
            FROM profil_pegawai p
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            LEFT JOIN mapping_pemegang_sektor m ON p.id = m.pegawai_id
            LEFT JOIN master_instansi_daerah i ON m.instansi_id = i.id
            ORDER BY p.nama_lengkap ASC, i.instansi ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sync instances for an employee
const update = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { pegawai_id, instansi_ids } = req.body;

        if (!pegawai_id || !Array.isArray(instansi_ids)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Data pegawai dan daftar instansi wajib diisi' });
        }

        // Delete existing
        await connection.query('DELETE FROM mapping_pemegang_sektor WHERE pegawai_id = ?', [pegawai_id]);

        // Insert new
        if (instansi_ids.length > 0) {
            const values = instansi_ids.map(instansi_id => [pegawai_id, instansi_id]);
            await connection.query('INSERT INTO mapping_pemegang_sektor (pegawai_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Pemetaan pemegang sektor berhasil disimpan' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Get instances coordinated by the employee's department (bidang)
const getAvailableInstansi = async (req, res) => {
    const { pegawai_id } = req.params;
    try {
        // 1. Get bidang_id of pegawai
        const [[pegawai]] = await pool.query('SELECT bidang_id FROM profil_pegawai WHERE id = ?', [pegawai_id]);
        if (!pegawai || !pegawai.bidang_id) {
            return res.json({ success: true, data: [] });
        }

        // 2. Get urusans coordinated by this bidang (mapping_bidang_pengampu uses bidang_instansi_id)
        const [urusans] = await pool.query('SELECT urusan_id FROM mapping_bidang_pengampu WHERE bidang_instansi_id = ?', [pegawai.bidang_id]);
        const urusanIds = urusans.map(u => u.urusan_id);

        if (urusanIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // 3. Get instances mapped to these urusans (mapping_urusan_instansi)
        // Note: Using DISTINCT to avoid duplicates if multiple urusans point to same SKPD
        const [instansi] = await pool.query(`
            SELECT DISTINCT i.id, i.instansi, i.singkatan
            FROM mapping_urusan_instansi m
            JOIN master_instansi_daerah i ON m.instansi_id = i.id
            WHERE m.urusan_id IN (?)
            ORDER BY i.instansi ASC
        `, [urusanIds]);

        res.json({ success: true, data: instansi });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, update, getAvailableInstansi };
