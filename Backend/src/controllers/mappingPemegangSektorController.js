const pool = require('../config/db');

// Get all employees and their mapped instances (sector holders)
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.id as pegawai_id, p.nama_lengkap, p.bidang_id, b.nama_bidang,
                j.jabatan as nama_jabatan,
                m.instansi_id, i.instansi as nama_instansi, i.singkatan as singkatan_instansi
            FROM profil_pegawai p
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN mapping_pemegang_sektor m ON p.id = m.pegawai_id
            LEFT JOIN master_instansi_daerah i ON m.instansi_id = i.id
            ORDER BY 
                CASE 
                    WHEN j.jabatan IN ('Kepala Badan', 'Kepala', 'Direktur') THEN 1
                    WHEN j.jabatan LIKE 'Sekretaris%' THEN 2
                    WHEN j.jabatan LIKE 'Kepala Bidang%' OR j.jabatan LIKE 'Kepala Bagian%' THEN 3
                    WHEN j.jabatan LIKE 'Kepala Sub Bagian%' OR j.jabatan LIKE 'Ketua Tim%' THEN 4
                    ELSE 5
                END ASC,
                p.nama_lengkap ASC, i.instansi ASC
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

        // 2. Get instances coordinated by this bidang (directly mapped in mapping_bidang_pengampu)
        const [instansi] = await pool.query(`
            SELECT DISTINCT i.id, i.instansi, i.singkatan
            FROM mapping_bidang_pengampu mbp
            JOIN master_instansi_daerah i ON mbp.instansi_id = i.id
            WHERE mbp.bidang_instansi_id = ?
            ORDER BY i.instansi ASC
        `, [pegawai.bidang_id]);

        res.json({ success: true, data: instansi });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, update, getAvailableInstansi };
