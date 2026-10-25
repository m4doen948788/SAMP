const pool = require('../../../config/db');
const { ensureDataMakroTablesAndData } = require('../utils/ensureDataMakro');

// 1. Get all indikator rows (basic info)
const getAll = async (req, res) => {
    try {
        let [rows] = await pool.query(`
            SELECT dm.*, COALESCE(ms.satuan, '') as satuan_nama
            FROM data_makro dm
            LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
            ORDER BY dm.urutan ASC, dm.id ASC
        `);

        // If no indicators exist, automatically initialize default indicators & values
        if (rows.length === 0) {
            await ensureDataMakroTablesAndData();
            const [reloadedRows] = await pool.query(`
                SELECT dm.*, COALESCE(ms.satuan, '') as satuan_nama
                FROM data_makro dm
                LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
                ORDER BY dm.urutan ASC, dm.id ASC
            `);
            rows = reloadedRows;
        }

        // Fetch all multi-tematiks safely
        let dmtRows = [];
        try {
            const [tRows] = await pool.query(`
                SELECT dmt.data_makro_id, dmt.tematik_id, COALESCE(mt.nama, '') as tematik_nama
                FROM data_makro_tematik dmt
                LEFT JOIN master_tematik mt ON dmt.tematik_id = mt.id
            `);
            dmtRows = tRows;
        } catch (e) {
            console.warn('[getAll] Note on data_makro_tematik:', e.message);
        }

        // Fetch all assigned pegawai safely
        let pegawaiRows = [];
        try {
            const [pRows] = await pool.query(`
                SELECT dmp.data_makro_id, dmp.profil_pegawai_id, COALESCE(pp.nama_lengkap, '') as nama_lengkap
                FROM data_makro_pegawai dmp
                LEFT JOIN profil_pegawai pp ON dmp.profil_pegawai_id = pp.id
            `);
            pegawaiRows = pRows;
        } catch (e) {
            console.warn('[getAll] Note on data_makro_pegawai:', e.message);
        }

        const data = rows.map(row => {
            const rowTematiks = dmtRows.filter(t => t.data_makro_id === row.id);
            const tematikIds = rowTematiks.map(t => t.tematik_id);
            const tematikNames = rowTematiks.map(t => t.tematik_nama).filter(Boolean);
            const assignedPegawaiRows = pegawaiRows.filter(p => p.data_makro_id === row.id);
            const assignedPegawai = assignedPegawaiRows.map(p => p.profil_pegawai_id);
            const assignedPegawaiNames = assignedPegawaiRows.map(p => p.nama_lengkap).filter(Boolean);

            return {
                ...row,
                tematik_ids: tematikIds,
                tematik_nama: tematikNames.length > 0 ? tematikNames.join(', ') : '',
                assigned_pegawai_ids: assignedPegawai,
                assigned_pegawai_names: assignedPegawaiNames
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error('[getAll] Error:', err);
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
        let [rows] = await pool.query(`
            SELECT dm.*, COALESCE(ms.satuan, '') as satuan_nama
            FROM data_makro dm
            LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
            WHERE dm.is_active = 1 OR dm.is_active IS NULL
            ORDER BY dm.urutan ASC, dm.id ASC
        `);

        // If table empty or no active indicators found, auto-ensure tables and seed indicators
        if (rows.length === 0) {
            await ensureDataMakroTablesAndData();
            const [reloadedRows] = await pool.query(`
                SELECT dm.*, COALESCE(ms.satuan, '') as satuan_nama
                FROM data_makro dm
                LEFT JOIN master_satuan ms ON dm.satuan_id = ms.id
                WHERE dm.is_active = 1 OR dm.is_active IS NULL
                ORDER BY dm.urutan ASC, dm.id ASC
            `);
            rows = reloadedRows;
        }

        // Fetch values for the range safely
        let nilaiRows = [];
        try {
            const [nRows] = await pool.query(`
                SELECT dmn.*, COALESCE(pp.nama_lengkap, '') as updated_by_nama
                FROM data_makro_nilai dmn
                LEFT JOIN profil_pegawai pp ON dmn.updated_by = pp.id
                WHERE dmn.tahun BETWEEN ? AND ?
            `, [tahun_start, tahun_end]);
            nilaiRows = nRows;
        } catch (e) {
            console.warn('[getWithNilai] Note on data_makro_nilai:', e.message);
        }

        // Fetch all assignments for these indicators safely
        let pegawaiRows = [];
        try {
            const [pRows] = await pool.query(`
                SELECT dmp.data_makro_id, dmp.profil_pegawai_id, COALESCE(pp.nama_lengkap, '') as nama_lengkap
                FROM data_makro_pegawai dmp
                LEFT JOIN profil_pegawai pp ON dmp.profil_pegawai_id = pp.id
            `);
            pegawaiRows = pRows;
        } catch (e) {
            console.warn('[getWithNilai] Note on data_makro_pegawai:', e.message);
        }

        // Fetch all multi-tematiks safely
        let dmtRows = [];
        try {
            const [tRows] = await pool.query(`
                SELECT dmt.data_makro_id, dmt.tematik_id, COALESCE(mt.nama, '') as tematik_nama
                FROM data_makro_tematik dmt
                LEFT JOIN master_tematik mt ON dmt.tematik_id = mt.id
            `);
            dmtRows = tRows;
        } catch (e) {
            console.warn('[getWithNilai] Note on data_makro_tematik:', e.message);
        }

        // Merge values and assignments into indicators
        const data = rows.map(row => {
            const values = nilaiRows.filter(nv => nv.data_makro_id === row.id);
            const nilaiMap = {};
            const nilaiMetaMap = {};
            values.forEach(v => {
                const key = `${v.tahun}_${v.tipe}`;
                nilaiMap[key] = v.nilai;
                nilaiMetaMap[key] = {
                    nilai: v.nilai,
                    updated_at: v.updated_at,
                    updated_by: v.updated_by,
                    updated_by_nama: v.updated_by_nama || null
                };
            });

            const assignedPegawaiRows = pegawaiRows.filter(p => p.data_makro_id === row.id);
            const assignedPegawai = assignedPegawaiRows.map(p => p.profil_pegawai_id);
            const assignedPegawaiNames = assignedPegawaiRows.map(p => p.nama_lengkap).filter(Boolean);

            const rowTematiks = dmtRows.filter(t => t.data_makro_id === row.id);
            const tematikIds = rowTematiks.map(t => t.tematik_id);
            const tematikNames = rowTematiks.map(t => t.tematik_nama).filter(Boolean);

            return { 
                ...row, 
                nilai: nilaiMap,
                nilai_meta: nilaiMetaMap,
                assigned_pegawai_ids: assignedPegawai,
                assigned_pegawai_names: assignedPegawaiNames,
                tematik_ids: tematikIds,
                tematik_nama: tematikNames.length > 0 ? tematikNames.join(', ') : ''
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error('[getWithNilai] Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Create indikator
const create = async (req, res) => {
    try {
        const { nama_data, kode, tematik_id, tematik_ids, sumber_data, satuan_id, urutan, parent_id } = req.body;
        if (!nama_data) {
            return res.status(400).json({ success: false, message: 'Nama data wajib diisi' });
        }
        const effectiveTematikIds = Array.isArray(tematik_ids) ? tematik_ids : (tematik_id ? [tematik_id] : []);
        const firstTematikId = effectiveTematikIds[0] || null;

        const [result] = await pool.query(
            'INSERT INTO data_makro (nama_data, kode, tematik_id, sumber_data, satuan_id, urutan, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nama_data, kode || '', firstTematikId, sumber_data || '', satuan_id || null, urutan || 0, parent_id || null]
        );
        const newId = result.insertId;

        if (effectiveTematikIds.length > 0) {
            const values = effectiveTematikIds.map(tid => [newId, tid]);
            await pool.query('INSERT INTO data_makro_tematik (data_makro_id, tematik_id) VALUES ?', [values]);
        }

        res.status(201).json({ success: true, data: { id: newId, ...req.body, tematik_ids: effectiveTematikIds } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Update indikator
const update = async (req, res) => {
    try {
        const { nama_data, kode, tematik_id, tematik_ids, sumber_data, satuan_id, urutan, parent_id, is_active } = req.body;
        const effectiveTematikIds = Array.isArray(tematik_ids) ? tematik_ids : (tematik_id ? [tematik_id] : (tematik_ids === null ? [] : undefined));
        const firstTematikId = effectiveTematikIds !== undefined ? (effectiveTematikIds[0] || null) : tematik_id;

        const [result] = await pool.query(
            'UPDATE data_makro SET nama_data = ?, kode = ?, tematik_id = ?, sumber_data = ?, satuan_id = ?, urutan = ?, parent_id = ?, is_active = ? WHERE id = ?',
            [nama_data, kode || '', firstTematikId ?? null, sumber_data || '', satuan_id || null, urutan || 0, parent_id || null, is_active ?? 1, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        if (effectiveTematikIds !== undefined) {
            await pool.query('DELETE FROM data_makro_tematik WHERE data_makro_id = ?', [req.params.id]);
            if (effectiveTematikIds.length > 0) {
                const values = effectiveTematikIds.map(tid => [req.params.id, tid]);
                await pool.query('INSERT INTO data_makro_tematik (data_makro_id, tematik_id) VALUES ?', [values]);
            }
        }

        res.json({ success: true, message: 'Data berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Delete indikator
const remove = async (req, res) => {
    try {
        await pool.query('DELETE FROM data_makro_tematik WHERE data_makro_id = ?', [req.params.id]);
        await pool.query('DELETE FROM data_makro_pegawai WHERE data_makro_id = ?', [req.params.id]);
        await pool.query('DELETE FROM data_makro_nilai WHERE data_makro_id = ?', [req.params.id]);
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

        const userProfilId = req.user?.profil_pegawai_id || req.body.updated_by || null;

        // Check backend permission if user token is present
        if (req.user) {
            const userRoleId = Number(req.user.tipe_user_id || 0);
            const userRoleName = (req.user.tipe_user_nama || '').toLowerCase();
            const jabatanNama = (req.user.jabatan_nama || '').toLowerCase();
            const bidangNama = (req.user.bidang_nama || '').toLowerCase();

            const isAdminInstansi = [1, 2, 7, 8].includes(userRoleId) || userRoleName.includes('admin');
            const isKepalaBadan = userRoleId === 5 || userRoleName.includes('kepala badan') || jabatanNama.includes('kepala badan') || (jabatanNama === 'kepala' && req.user.instansi_id === 2);
            const isSekretariatBadan = bidangNama.includes('sekretariat') || jabatanNama.includes('sekretaris');

            if (!isAdminInstansi && !isKepalaBadan && !isSekretariatBadan) {
                // Must be assigned to this indicator
                let isAssigned = false;
                try {
                    const [pegRows] = await pool.query(
                        'SELECT id FROM data_makro_pegawai WHERE data_makro_id = ? AND profil_pegawai_id = ?',
                        [data_makro_id, userProfilId]
                    );
                    if (pegRows.length > 0) isAssigned = true;
                } catch (e) {
                    // ignore if table error
                }

                if (!isAssigned) {
                    return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya pegawai yang ditugaskan, Admin Instansi, Sekretariat Badan, dan Kepala Badan yang dapat mengubah nilai data makro.' });
                }
            }
        }
        
        await pool.query(`
            INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai, updated_by, updated_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                nilai = VALUES(nilai),
                updated_by = VALUES(updated_by),
                updated_at = NOW()
        `, [data_makro_id, tahun, tipe, nilai, userProfilId]);

        res.json({ success: true, message: 'Nilai berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 7. Get assigned pegawai
const getPegawai = async (req, res) => {
    try {
        let rows = [];
        try {
            const [pRows] = await pool.query(`
                SELECT dmp.*, COALESCE(pp.nama_lengkap, '') as nama_lengkap, COALESCE(pp.nip, '') as nip, COALESCE(j.jabatan, '') as jabatan_nama
                FROM data_makro_pegawai dmp
                LEFT JOIN profil_pegawai pp ON dmp.profil_pegawai_id = pp.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                WHERE dmp.data_makro_id = ?
            `, [req.params.id]);
            rows = pRows;
        } catch (tableErr) {
            console.warn('[getPegawai] Note on table:', tableErr.message);
        }
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
        const { profil_ids } = req.body;
        const data_makro_id = req.params.id;

        await connection.query('DELETE FROM data_makro_pegawai WHERE data_makro_id = ?', [data_makro_id]);

        if (profil_ids && profil_ids.length > 0) {
            const values = profil_ids.map(pid => [data_makro_id, pid]);
            await connection.query('INSERT INTO data_makro_pegawai (data_makro_id, profil_pegawai_id) VALUES ?', [values]);
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
        let rows = [];
        try {
            const [oRows] = await pool.query(`
                SELECT dmo.*, COALESCE(pp.nama_lengkap, '') as nama_lengkap, COALESCE(pp.nip, '') as nip, COALESCE(j.jabatan, '') as jabatan_nama
                FROM data_makro_otoritas dmo
                LEFT JOIN profil_pegawai pp ON dmo.profil_pegawai_id = pp.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
            `);
            rows = oRows;
        } catch (tableErr) {
            console.warn('[getOtoritas] Note on table:', tableErr.message);
        }
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
            await connection.query('INSERT INTO data_makro_otoritas (profil_pegawai_id) VALUES ?', [values]);
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

// 11. Get user chart selection
const getUserChartSelection = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?.userId || null;
        if (!currentUserId) {
            return res.json({ success: true, data: [] });
        }
        let rows = [];
        try {
            const [sRows] = await pool.query(
                "SELECT setting_value FROM user_dashboard_settings WHERE user_id = ? AND setting_key = 'data_makro_chart_selection'",
                [currentUserId]
            );
            rows = sRows;
        } catch (e) {
            console.warn('[getUserChartSelection] Note on table:', e.message);
        }

        let selectedIds = [];
        if (rows.length > 0 && rows[0].setting_value) {
            try {
                selectedIds = JSON.parse(rows[0].setting_value);
            } catch (e) {
                selectedIds = [];
            }
        }
        res.json({ success: true, data: selectedIds });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 12. Save user chart selection
const saveUserChartSelection = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?.userId || null;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { indicator_ids } = req.body;
        if (!Array.isArray(indicator_ids)) {
            return res.status(400).json({ success: false, message: 'indicator_ids harus berupa array' });
        }

        const jsonValue = JSON.stringify(indicator_ids);
        await pool.query(
            `INSERT INTO user_dashboard_settings (user_id, setting_key, setting_value)
             VALUES (?, 'data_makro_chart_selection', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
            [currentUserId, jsonValue]
        );

        res.json({ success: true, message: 'Pilihan grafik berhasil disimpan', data: indicator_ids });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { 
    getAll, 
    getWithNilai, 
    create, 
    update, 
    remove, 
    upsertNilai, 
    getPegawai, 
    setPegawai, 
    getOtoritas, 
    setOtoritas,
    getUserChartSelection,
    saveUserChartSelection
};
