const pool = require('../config/db');

// 1. Get all indikator rows (basic info)
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT dm.*, mt.nama as tematik_nama, ms.satuan as satuan_nama
            FROM data_makro dm
            LEFT JOIN master_tematik mt ON dm.tematik_id = mt.id
            LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
            ORDER BY dm.urutan ASC, dm.id ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get rows with values (pivoted for the main view)
const getWithNilai = async (req, res) => {
    try {
        const { tahun_start, tahun_end } = req.query;
        if (!tahun_start || !tahun_end) {
            return res.status(400).json({ success: false, message: 'Range tahun wajib diisi' });
        }

        // Fetch indicators
        const [rows] = await pool.query(`
            SELECT dm.*, mt.nama as tematik_nama, ms.satuan as satuan_nama
            FROM data_makro dm
            LEFT JOIN master_tematik mt ON dm.tematik_id = mt.id
            LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
            WHERE dm.is_active = 1
            ORDER BY dm.urutan ASC, dm.id ASC
        `);

        // Fetch values for the range
        const [nilaiRows] = await pool.query(`
            SELECT * FROM data_makro_nilai 
            WHERE tahun BETWEEN ? AND ?
        `, [tahun_start, tahun_end]);

        // Fetch all assignments for these indicators
        const [pegawaiRows] = await pool.query(`
            SELECT * FROM data_makro_pegawai
        `);

        // Merge values and assignments into indicators
        const data = rows.map(row => {
            const values = nilaiRows.filter(nv => nv.data_makro_id === row.id);
            const nilaiMap = {};
            values.forEach(v => {
                const key = `${v.tahun}_${v.tipe}`;
                nilaiMap[key] = v.nilai;
            });

            const assignedPegawai = pegawaiRows
                .filter(p => p.data_makro_id === row.id)
                .map(p => p.profil_pegawai_id);

            return { 
                ...row, 
                nilai: nilaiMap,
                assigned_pegawai_ids: assignedPegawai
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Create indikator
const create = async (req, res) => {
    try {
        const { nama_data, kode, tematik_id, sumber_data, satuan_id, urutan, parent_id } = req.body;
        if (!nama_data) {
            return res.status(400).json({ success: false, message: 'Nama data wajib diisi' });
        }
        const [result] = await pool.query(
            'INSERT INTO data_makro (nama_data, kode, tematik_id, sumber_data, satuan_id, urutan, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nama_data, kode || '', tematik_id || null, sumber_data || '', satuan_id || null, urutan || 0, parent_id || null]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Update indikator
const update = async (req, res) => {
    try {
        const { nama_data, kode, tematik_id, sumber_data, satuan_id, urutan, parent_id, is_active } = req.body;
        const [result] = await pool.query(
            'UPDATE data_makro SET nama_data = ?, kode = ?, tematik_id = ?, sumber_data = ?, satuan_id = ?, urutan = ?, parent_id = ?, is_active = ? WHERE id = ?',
            [nama_data, kode || '', tematik_id || null, sumber_data || '', satuan_id || null, urutan || 0, parent_id || null, is_active ?? 1, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Delete indikator
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM data_makro WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. Upsert Nilai (Target/Realisasi)
const upsertNilai = async (req, res) => {
    try {
        const { data_makro_id, tahun, tipe, nilai } = req.body;
        if (!data_makro_id || !tahun || !tipe) {
            return res.status(400).json({ success: false, message: 'Data ID, tahun, dan tipe wajib diisi' });
        }
        
        await pool.query(`
            INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)
        `, [data_makro_id, tahun, tipe, nilai]);

        res.json({ success: true, message: 'Nilai berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 7. Get assigned pegawai
const getPegawai = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT dmp.*, pp.nama_lengkap, pp.nip, pp.jabatan
            FROM data_makro_pegawai dmp
            JOIN profil_pegawai pp ON dmp.profil_pegawai_id = pp.id
            WHERE dmp.data_makro_id = ?
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 8. Set assigned pegawai
const setPegawai = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { profil_ids } = req.body; // Expecting array of profil_pegawai_id
        const data_makro_id = req.params.id;

        // First clear existing
        await connection.query('DELETE FROM data_makro_pegawai WHERE data_makro_id = ?', [data_makro_id]);

        // Then insert new ones
        if (profil_ids && profil_ids.length > 0) {
            const values = profil_ids.map(pid => [data_makro_id, pid]);
            await pool.query('INSERT INTO data_makro_pegawai (data_makro_id, profil_pegawai_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Pegawai berhasil ditugaskan' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// 9. Get all authorized users for adding macro data
const getOtoritas = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT dmo.*, pp.nama_lengkap, pp.nip, pp.jabatan
            FROM data_makro_otoritas dmo
            JOIN profil_pegawai pp ON dmo.profil_pegawai_id = pp.id
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 10. Set authorized users for adding macro data
const setOtoritas = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { profil_ids } = req.body;

        await connection.query('DELETE FROM data_makro_otoritas');

        if (profil_ids && profil_ids.length > 0) {
            const values = profil_ids.map(pid => [pid]);
            await pool.query('INSERT INTO data_makro_otoritas (profil_pegawai_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Otorisasi berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

module.exports = { getAll, getWithNilai, create, update, remove, upsertNilai, getPegawai, setPegawai, getOtoritas, setOtoritas };
