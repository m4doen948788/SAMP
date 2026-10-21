const pool = require('../../../config/db');
const { syncToKegiatanPegawai } = require('./kegiatanManajemenController');
const notificationService = require('../../system/services/notificationService');
const recordDraftHistory = async (connectionOrPool, draftId, userId, aksi, keterangan) => {
    try {
        await connectionOrPool.query(
            'INSERT INTO draft_jadwal_edit_history (draft_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [draftId, userId || null, aksi, keterangan]
        );
    } catch (err) {
        console.error('[recordDraftHistory Error]:', err);
    }
};

const checkCanModifyIntegratedDraft = async (connectionOrPool, draftId, user) => {
    if (!user) return false;
    const userId = Number(user.id);
    const userTipe = Number(user.tipe_user || user.tipe_user_id || 0);

    // Superadmin has full access
    if (userTipe === 1) return true;

    const [draftRows] = await connectionOrPool.query(
        'SELECT id, status, created_by, ketua_tim_id, bidang_ids FROM draft_jadwal_kegiatan WHERE id = ?',
        [draftId]
    );
    if (draftRows.length === 0) return false;
    const draft = draftRows[0];

    // If draft is not yet integrated, standard draft permissions apply
    if (draft.status !== 'terintegrasi') return true;

    // 1. Staff yang membuat draft
    if (draft.created_by && Number(draft.created_by) === userId) return true;

    // 2. Ketua Tim yang ditugaskan pada draft
    if (draft.ketua_tim_id && Number(draft.ketua_tim_id) === userId) return true;

    // Check user's jabatan and role
    const [userRows] = await connectionOrPool.query(`
        SELECT pp.bidang_id, mj.jabatan, mtu.tipe_user
        FROM users u
        LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
        LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
        LEFT JOIN master_tipe_user mtu ON pp.tipe_user_id = mtu.id
        WHERE u.id = ?
    `, [userId]);

    if (userRows.length > 0) {
        const u = userRows[0];
        const jab = (u.jabatan || '').toLowerCase();
        const tipe = (u.tipe_user || '').toLowerCase();
        const isKatim = jab.includes('ketua tim') || jab.includes('katim') || tipe.includes('ketua tim');
        const isAdmin = userTipe === 1 || userTipe === 2 || tipe.includes('admin');

        const userBidangId = u.bidang_id ? String(u.bidang_id) : null;
        const draftBidangs = draft.bidang_ids ? String(draft.bidang_ids).split(',') : [];
        const isSameBidang = !userBidangId || draftBidangs.length === 0 || draftBidangs.includes(userBidangId);

        // 2b. Ketua Tim pada bidang yang sama
        if (isKatim && isSameBidang) return true;

        // 3. Admin Bidang pada bidang yang sama
        if (isAdmin && isSameBidang) return true;
    }

    return false;
};

const draftJadwalController = {
    // 1. Get List Kecamatan based on logged in user's kabupaten/kota
    getKecamatan: async (req, res) => {
        try {
            let kotaId = '3201'; // Default fallback: Kabupaten Bogor
            let instansiNama = '';

            if (req.user && req.user.instansi_id) {
                const [instRows] = await pool.query(
                    'SELECT id, instansi, kota_kabupaten_id FROM master_instansi_daerah WHERE id = ?',
                    [req.user.instansi_id]
                );
                if (instRows.length > 0) {
                    instansiNama = instRows[0].instansi || '';
                    if (instRows[0].kota_kabupaten_id) {
                        kotaId = String(instRows[0].kota_kabupaten_id);
                    }
                }
            }

            // Get Kabupaten info
            const [kabRows] = await pool.query(
                'SELECT id, nama, provinsi_id FROM master_kota_kabupaten WHERE id = ?',
                [kotaId]
            );
            const kabupaten = kabRows.length > 0 ? kabRows[0] : { id: kotaId, nama: 'KABUPATEN BOGOR' };

            // Get list kecamatan
            const [kecamatanRows] = await pool.query(
                'SELECT id, nama, kota_kabupaten_id FROM master_kecamatan WHERE kota_kabupaten_id = ? ORDER BY nama ASC',
                [kotaId]
            );

            res.json({
                success: true,
                kabupaten,
                instansiNama,
                data: kecamatanRows
            });
        } catch (err) {
            console.error('[getKecamatan Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengambil data kecamatan: ' + err.message });
        }
    },

    // 2. Check officer availability (specifically locking officers who already have DL)
    checkDlAvailability: async (req, res) => {
        try {
            const { tanggal_mulai, tanggal_akhir, exclude_kegiatan_id } = req.query;

            if (!tanggal_mulai) {
                return res.status(400).json({ success: false, message: 'Tanggal mulai wajib diisi' });
            }

            const startDate = tanggal_mulai;
            const endDate = tanggal_akhir || tanggal_mulai;

            let query = `
                SELECT 
                    khp.profil_pegawai_id,
                    pp.nama_lengkap,
                    DATE_FORMAT(khp.tanggal, '%Y-%m-%d') as tanggal,
                    khp.tipe_kegiatan,
                    khp.nama_kegiatan,
                    khp.sesi,
                    COALESCE(mtk.nama, khp.tipe_kegiatan) as tipe_nama
                FROM kegiatan_harian_pegawai khp
                JOIN profil_pegawai pp ON khp.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_kegiatan mtk ON khp.tipe_kegiatan = mtk.kode
                WHERE khp.tanggal BETWEEN ? AND ?
                AND (
                    khp.tipe_kegiatan IN ('DL', 'DLB')
                    OR mtk.nama IN ('Dinas Luar', 'DL Luar Bidang')
                )
            `;
            const params = [startDate, endDate];

            if (exclude_kegiatan_id) {
                query += ' AND (khp.id_kegiatan_eksternal IS NULL OR khp.id_kegiatan_eksternal != ?)';
                params.push(String(exclude_kegiatan_id));
            }

            const [rows] = await pool.query(query, params);

            const unavailableMap = {};
            rows.forEach(r => {
                if (!unavailableMap[r.profil_pegawai_id]) {
                    unavailableMap[r.profil_pegawai_id] = {
                        profil_pegawai_id: r.profil_pegawai_id,
                        nama_lengkap: r.nama_lengkap,
                        conflicts: []
                    };
                }
                unavailableMap[r.profil_pegawai_id].conflicts.push({
                    tanggal: r.tanggal,
                    nama_kegiatan: r.nama_kegiatan,
                    tipe_kegiatan: r.tipe_kegiatan,
                    tipe_nama: r.tipe_nama,
                    sesi: r.sesi
                });
            });

            res.json({
                success: true,
                startDate,
                endDate,
                data: unavailableMap
            });
        } catch (err) {
            console.error('[checkDlAvailability Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengecek ketersediaan petugas: ' + err.message });
        }
    },

    // 3. Get all drafts with their teams
    getAll: async (req, res) => {
        try {
            const { search, status, jenis_kegiatan_id, is_trash, bidang_id } = req.query;
            const isTrash = is_trash === '1' || is_trash === 'true';

            // Role & Scope Check
            const userTipe = req.user ? req.user.tipe_user_id : null;
            const userJabatan = req.user ? (req.user.jabatan_nama || '') : '';
            const userInstansiId = req.user ? req.user.instansi_id : null;
            const userBidangId = req.user ? req.user.bidang_id : null;
            const userId = req.user ? req.user.id : null;

            let dbScope = 2; // Default bidang level
            if (userTipe === 1) {
                dbScope = 4; // Superadmin
            } else if (userTipe) {
                const [scopeRows] = await pool.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
                if (scopeRows.length > 0) {
                    dbScope = scopeRows[0].scope;
                }
            }

            const isSuperadmin = Number(userTipe) === 1 || dbScope === 4;
            const isGlobal = isSuperadmin;
            const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris') || userJabatan.toLowerCase().includes('kepala badan') || userJabatan.toLowerCase().includes('kepala dinas');
            const isBidangLevel = !isGlobal && !isInstansiLevel;

            // Trash count query with access scope
            let trashCountQuery = `
                SELECT COUNT(DISTINCT d.id) as count 
                FROM draft_jadwal_kegiatan d 
                LEFT JOIN users u ON d.created_by = u.id 
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                WHERE d.is_deleted = 1
            `;
            const trashCountParams = [];

            if (!isGlobal && userInstansiId) {
                trashCountQuery += ' AND (pp.instansi_id = ? OR d.created_by = ? OR d.ketua_tim_id = ?)';
                trashCountParams.push(userInstansiId, userId, userId);
            }

            if (isBidangLevel && userBidangId) {
                trashCountQuery += ` AND (
                    pp.bidang_id = ? 
                    OR FIND_IN_SET(?, d.bidang_ids) > 0
                    OR d.created_by = ?
                    OR d.ketua_tim_id = ?
                    OR EXISTS (
                        SELECT 1 FROM draft_jadwal_tim t_sub 
                        JOIN profil_pegawai pp_sub ON FIND_IN_SET(pp_sub.id, t_sub.petugas_ids) > 0 
                        WHERE t_sub.draft_id = d.id AND pp_sub.bidang_id = ?
                    )
                )`;
                trashCountParams.push(userBidangId, userBidangId, userId, userId, userBidangId);
            } else if (bidang_id && bidang_id !== 'all') {
                trashCountQuery += ` AND (
                    pp.bidang_id = ? 
                    OR FIND_IN_SET(?, d.bidang_ids) > 0
                    OR EXISTS (
                        SELECT 1 FROM draft_jadwal_tim t_sub 
                        JOIN profil_pegawai pp_sub ON FIND_IN_SET(pp_sub.id, t_sub.petugas_ids) > 0 
                        WHERE t_sub.draft_id = d.id AND pp_sub.bidang_id = ?
                    )
                )`;
                trashCountParams.push(bidang_id, bidang_id, bidang_id);
            }

            if (!isSuperadmin) {
                trashCountQuery += " AND (COALESCE(d.visibility, 'bidang') != 'personal' OR d.created_by = ?)";
                trashCountParams.push(userId);
            }

            const [trashCountRows] = await pool.query(trashCountQuery, trashCountParams);
            const trashCount = trashCountRows[0]?.count || 0;

            let query = `
                SELECT 
                    d.id,
                    d.nama_kegiatan,
                    d.jenis_kegiatan_id,
                    d.bidang_ids,
                    d.status,
                    d.visibility,
                    d.ketua_tim_id,
                    d.catatan_katim,
                    d.approved_by,
                    d.approved_at,
                    d.created_by,
                    d.created_at,
                    d.updated_at,
                    d.is_deleted,
                    DATE_FORMAT(d.deleted_at, '%Y-%m-%d %H:%i:%s') as deleted_at,
                    d.deleted_by,
                    tk.nama as jenis_kegiatan_nama,
                    tk.kode as jenis_kegiatan_kode,
                    tk.warna as jenis_kegiatan_warna,
                    tk.warna_teks as jenis_kegiatan_warna_teks,
                    pp.nama_lengkap as pembuat_nama,
                    pp.bidang_id as pembuat_bidang_id,
                    mbi.nama_bidang as pembuat_bidang_nama,
                    mbi.singkatan as pembuat_bidang_singkatan,
                    pp_katim.nama_lengkap as ketua_tim_nama,
                    pp_del.nama_lengkap as penghapus_nama
                FROM draft_jadwal_kegiatan d
                LEFT JOIN master_tipe_kegiatan tk ON d.jenis_kegiatan_id = tk.id
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_bidang_instansi mbi ON pp.bidang_id = mbi.id
                LEFT JOIN users u_katim ON d.ketua_tim_id = u_katim.id
                LEFT JOIN profil_pegawai pp_katim ON u_katim.profil_pegawai_id = pp_katim.id
                LEFT JOIN users u_del ON d.deleted_by = u_del.id
                LEFT JOIN profil_pegawai pp_del ON u_del.profil_pegawai_id = pp_del.id
                WHERE d.is_deleted = ?
            `;
            const params = [isTrash ? 1 : 0];

            if (!isGlobal && userInstansiId) {
                query += ' AND (pp.instansi_id = ? OR d.created_by = ? OR d.ketua_tim_id = ?)';
                params.push(userInstansiId, userId, userId);
            }

            if (isBidangLevel && userBidangId) {
                query += ` AND (
                    pp.bidang_id = ? 
                    OR FIND_IN_SET(?, d.bidang_ids) > 0
                    OR d.created_by = ?
                    OR d.ketua_tim_id = ?
                    OR EXISTS (
                        SELECT 1 FROM draft_jadwal_tim t_sub 
                        JOIN profil_pegawai pp_sub ON FIND_IN_SET(pp_sub.id, t_sub.petugas_ids) > 0 
                        WHERE t_sub.draft_id = d.id AND t_sub.is_deleted = 0 AND pp_sub.bidang_id = ?
                    )
                )`;
                params.push(userBidangId, userBidangId, userId, userId, userBidangId);
            } else if (bidang_id && bidang_id !== 'all') {
                query += ` AND (
                    pp.bidang_id = ? 
                    OR FIND_IN_SET(?, d.bidang_ids) > 0
                    OR EXISTS (
                        SELECT 1 FROM draft_jadwal_tim t_sub 
                        JOIN profil_pegawai pp_sub ON FIND_IN_SET(pp_sub.id, t_sub.petugas_ids) > 0 
                        WHERE t_sub.draft_id = d.id AND t_sub.is_deleted = 0 AND pp_sub.bidang_id = ?
                    )
                )`;
                params.push(bidang_id, bidang_id, bidang_id);
            }

            if (search) {
                query += ' AND (d.nama_kegiatan LIKE ?)';
                params.push(`%${search}%`);
            }

            if (status && status !== 'all') {
                query += ' AND d.status = ?';
                params.push(status);
            }

            if (jenis_kegiatan_id) {
                query += ' AND d.jenis_kegiatan_id = ?';
                params.push(jenis_kegiatan_id);
            }

            // Aturan Visibilitas: 'personal' hanya muncul di halaman user pembuat (atau superadmin)
            if (!isSuperadmin) {
                query += " AND (COALESCE(d.visibility, 'bidang') != 'personal' OR d.created_by = ?)";
                params.push(userId);
            }

            if (req.query.visibility === 'personal') {
                query += " AND d.created_by = ?";
                params.push(userId);
            } else if (req.query.visibility === 'bidang') {
                query += " AND COALESCE(d.visibility, 'bidang') = 'bidang'";
            }

            if (isTrash) {
                query += ' ORDER BY d.deleted_at DESC, d.id DESC';
            } else {
                query += ' ORDER BY d.id DESC';
            }

            const [drafts] = await pool.query(query, params);

            if (drafts.length === 0) {
                return res.json({ success: true, data: [], trash_count: trashCount });
            }

            const draftIds = drafts.map(d => d.id);

            // Fetch teams for all these drafts
            let teamQuery = `
                SELECT 
                    t.id,
                    t.draft_id,
                    t.nama_tim,
                    DATE_FORMAT(t.tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
                    DATE_FORMAT(t.tanggal_akhir, '%Y-%m-%d') as tanggal_akhir,
                    t.kota_kabupaten_id,
                    t.kecamatan_id,
                    t.lokasi_detail,
                    t.petugas_ids,
                    t.keterangan,
                    t.status,
                    t.kegiatan_manajemen_id,
                    t.is_deleted,
                    t.created_at,
                    t.updated_at,
                    mk.nama as kecamatan_nama,
                    kab.nama as kabupaten_nama
                FROM draft_jadwal_tim t
                LEFT JOIN master_kecamatan mk ON t.kecamatan_id = mk.id
                LEFT JOIN master_kota_kabupaten kab ON t.kota_kabupaten_id = kab.id
                WHERE t.draft_id IN (?)
            `;
            if (!isTrash) {
                teamQuery += ' AND t.is_deleted = 0';
            }
            teamQuery += ' ORDER BY t.id ASC';

            const [teamRows] = await pool.query(teamQuery, [draftIds]);

            // Collect all unique petugas_ids & kecamatan_ids
            const allPetugasIds = new Set();
            const allKecamatanIds = new Set();
            teamRows.forEach(t => {
                if (t.petugas_ids) {
                    t.petugas_ids.split(',').forEach(id => {
                        const num = Number(id.trim());
                        if (num > 0) allPetugasIds.add(num);
                    });
                }
                if (t.kecamatan_id) {
                    String(t.kecamatan_id).split(',').forEach(id => {
                        const trimmed = id.trim();
                        if (trimmed) allKecamatanIds.add(trimmed);
                    });
                }
            });

            let officersMap = {};
            if (allPetugasIds.size > 0) {
                const [officerRows] = await pool.query(`
                    SELECT p.id, p.nama_lengkap, p.nip, p.bidang_id, b.nama_bidang, b.singkatan as bidang_singkatan
                    FROM profil_pegawai p
                    LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
                    WHERE p.id IN (?)
                `, [Array.from(allPetugasIds)]);

                officerRows.forEach(o => {
                    officersMap[o.id] = o;
                });
            }

            let kecamatanMap = {};
            if (allKecamatanIds.size > 0) {
                const [kecRows] = await pool.query(
                    'SELECT id, nama FROM master_kecamatan WHERE id IN (?)',
                    [Array.from(allKecamatanIds)]
                );
                kecRows.forEach(k => {
                    kecamatanMap[String(k.id)] = k.nama;
                });
            }

            // Map teams with officer objects and resolved kecamatan names
            const teamsByDraft = {};
            teamRows.forEach(t => {
                const pIds = t.petugas_ids ? t.petugas_ids.split(',').map(Number).filter(Boolean) : [];
                const officerList = pIds.map(id => officersMap[id]).filter(Boolean);

                const kecIds = t.kecamatan_id ? String(t.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean) : [];
                const resolvedKecNama = kecIds.map(id => kecamatanMap[id]).filter(Boolean).join(', ');

                const teamObj = {
                    ...t,
                    kecamatan_nama: resolvedKecNama || t.kecamatan_nama || null,
                    officers: officerList,
                    total_petugas: pIds.length,
                    is_complete: Boolean(t.tanggal_mulai && t.kecamatan_id && pIds.length > 0)
                };

                if (!teamsByDraft[t.draft_id]) {
                    teamsByDraft[t.draft_id] = [];
                }
                teamsByDraft[t.draft_id].push(teamObj);
            });

            // Fetch edit history for all these drafts
            const [historyRows] = await pool.query(`
                SELECT 
                    h.id, h.draft_id, h.user_id, h.aksi, h.keterangan, 
                    DATE_FORMAT(h.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    COALESCE(pp.nama_lengkap, u.username, 'User') as user_nama
                FROM draft_jadwal_edit_history h
                LEFT JOIN users u ON h.user_id = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                WHERE h.draft_id IN (?)
                ORDER BY h.created_at DESC, h.id DESC
            `, [draftIds]);

            const historyByDraft = {};
            historyRows.forEach(h => {
                if (!historyByDraft[h.draft_id]) historyByDraft[h.draft_id] = [];
                historyByDraft[h.draft_id].push(h);
            });

            // Format drafts with teams
            const formattedDrafts = drafts.map(d => {
                const teams = teamsByDraft[d.id] || [];
                const totalSchedules = teams.length;
                const uniqueTeamNames = new Set(teams.map(t => (t.nama_tim || '').trim()).filter(Boolean));
                const uniqueDates = new Set(teams.map(t => t.tanggal_mulai).filter(Boolean));
                const totalUniqueTeams = uniqueTeamNames.size || totalSchedules;
                const totalDays = uniqueDates.size;
                const integratedTeams = teams.filter(t => t.status === 'terintegrasi').length;
                const readyTeams = teams.filter(t => t.is_complete && t.status !== 'terintegrasi').length;

                let overallStatus = d.status || 'draft';
                if (overallStatus !== 'menunggu_persetujuan' && overallStatus !== 'dikembalikan') {
                    if (totalSchedules > 0 && integratedTeams === totalSchedules) {
                        overallStatus = 'terintegrasi';
                    } else if (integratedTeams > 0) {
                        overallStatus = 'sebagian';
                    }
                }

                // Collect unique officers for the whole draft
                const draftOfficerIds = new Set();
                teams.forEach(t => {
                    (t.officers || []).forEach(o => draftOfficerIds.add(o.id));
                });

                return {
                    ...d,
                    status: overallStatus,
                    teams,
                    edit_history: historyByDraft[d.id] || [],
                    total_teams: totalUniqueTeams,
                    total_team_schedules: totalSchedules,
                    total_days: totalDays,
                    integrated_teams: integratedTeams,
                    ready_teams: readyTeams,
                    total_unique_officers: draftOfficerIds.size
                };
            });

            res.json({ success: true, data: formattedDrafts, trash_count: trashCount });
        } catch (err) {
            console.error('[getAll Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengambil draft jadwal: ' + err.message });
        }
    },

    // 4. Get Draft by ID
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const [rows] = await pool.query(`
                SELECT 
                    d.*,
                    DATE_FORMAT(d.deleted_at, '%Y-%m-%d %H:%i:%s') as deleted_at,
                    tk.nama as jenis_kegiatan_nama,
                    tk.kode as jenis_kegiatan_kode,
                    tk.warna as jenis_kegiatan_warna,
                    tk.warna_teks as jenis_kegiatan_warna_teks,
                    pp.nama_lengkap as pembuat_nama,
                    pp.bidang_id as pembuat_bidang_id,
                    mbi.nama_bidang as pembuat_bidang_nama,
                    mbi.singkatan as pembuat_bidang_singkatan,
                    pp_katim.nama_lengkap as ketua_tim_nama,
                    pp_del.nama_lengkap as penghapus_nama
                FROM draft_jadwal_kegiatan d
                LEFT JOIN master_tipe_kegiatan tk ON d.jenis_kegiatan_id = tk.id
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_bidang_instansi mbi ON pp.bidang_id = mbi.id
                LEFT JOIN users u_katim ON d.ketua_tim_id = u_katim.id
                LEFT JOIN profil_pegawai pp_katim ON u_katim.profil_pegawai_id = pp_katim.id
                LEFT JOIN users u_del ON d.deleted_by = u_del.id
                LEFT JOIN profil_pegawai pp_del ON u_del.profil_pegawai_id = pp_del.id
                WHERE d.id = ?
            `, [id]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan' });
            }

            const draft = rows[0];

            // Role & Scope Check
            const userTipe = req.user ? req.user.tipe_user_id : null;
            const userJabatan = req.user ? (req.user.jabatan_nama || '') : '';
            const userBidangId = req.user ? req.user.bidang_id : null;
            const userId = req.user ? req.user.id : null;

            let dbScope = 2;
            if (userTipe === 1) dbScope = 4;
            else if (userTipe) {
                const [scopeRows] = await pool.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
                if (scopeRows.length > 0) dbScope = scopeRows[0].scope;
            }
            const isGlobal = dbScope === 4 || userTipe === 1;
            const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris') || userJabatan.toLowerCase().includes('kepala badan') || userJabatan.toLowerCase().includes('kepala dinas');
            const isBidangLevel = !isGlobal && !isInstansiLevel;

            if (isBidangLevel && userBidangId) {
                const isCreator = draft.created_by === userId;
                const isKatim = draft.ketua_tim_id === userId;
                const isSameBidang = draft.pembuat_bidang_id === userBidangId || String(draft.bidang_ids || '').split(',').includes(String(userBidangId));

                const [officerMatch] = await pool.query(`
                    SELECT 1 FROM draft_jadwal_tim t_sub
                    JOIN profil_pegawai pp_sub ON FIND_IN_SET(pp_sub.id, t_sub.petugas_ids) > 0
                    WHERE t_sub.draft_id = ? AND pp_sub.bidang_id = ?
                    LIMIT 1
                `, [id, userBidangId]);

                if (!isCreator && !isKatim && !isSameBidang && officerMatch.length === 0) {
                    return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk melihat draft jadwal bidang lain' });
                }
            }

            // Get teams (if draft is deleted, show its teams as well; otherwise show active teams)
            const [teams] = await pool.query(`
                SELECT 
                    t.*,
                    DATE_FORMAT(t.tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
                    DATE_FORMAT(t.tanggal_akhir, '%Y-%m-%d') as tanggal_akhir,
                    mk.nama as kecamatan_nama,
                    kab.nama as kabupaten_nama
                FROM draft_jadwal_tim t
                LEFT JOIN master_kecamatan mk ON t.kecamatan_id = mk.id
                LEFT JOIN master_kota_kabupaten kab ON t.kota_kabupaten_id = kab.id
                WHERE t.draft_id = ? AND (t.is_deleted = 0 OR ? = 1)
                ORDER BY t.id ASC
            `, [id, draft.is_deleted ? 1 : 0]);

            // Officers & Kecamatan
            const allPetugasIds = new Set();
            const allKecamatanIds = new Set();
            teams.forEach(t => {
                if (t.petugas_ids) {
                    t.petugas_ids.split(',').forEach(pid => {
                        const num = Number(pid.trim());
                        if (num > 0) allPetugasIds.add(num);
                    });
                }
                if (t.kecamatan_id) {
                    String(t.kecamatan_id).split(',').forEach(id => {
                        const trimmed = id.trim();
                        if (trimmed) allKecamatanIds.add(trimmed);
                    });
                }
            });

            let officersMap = {};
            if (allPetugasIds.size > 0) {
                const [officerRows] = await pool.query(`
                    SELECT p.id, p.nama_lengkap, p.nip, p.bidang_id, b.nama_bidang, b.singkatan as bidang_singkatan
                    FROM profil_pegawai p
                    LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
                    WHERE p.id IN (?)
                `, [Array.from(allPetugasIds)]);

                officerRows.forEach(o => {
                    officersMap[o.id] = o;
                });
            }

            let kecamatanMap = {};
            if (allKecamatanIds.size > 0) {
                const [kecRows] = await pool.query(
                    'SELECT id, nama FROM master_kecamatan WHERE id IN (?)',
                    [Array.from(allKecamatanIds)]
                );
                kecRows.forEach(k => {
                    kecamatanMap[String(k.id)] = k.nama;
                });
            }

            const formattedTeams = teams.map(t => {
                const pIds = t.petugas_ids ? t.petugas_ids.split(',').map(Number).filter(Boolean) : [];
                const kecIds = t.kecamatan_id ? String(t.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean) : [];
                const resolvedKecNama = kecIds.map(id => kecamatanMap[id]).filter(Boolean).join(', ');
                return {
                    ...t,
                    kecamatan_nama: resolvedKecNama || t.kecamatan_nama || null,
                    officers: pIds.map(pid => officersMap[pid]).filter(Boolean),
                    total_petugas: pIds.length,
                    is_complete: Boolean(t.tanggal_mulai && t.kecamatan_id && pIds.length > 0)
                };
            });

            // Fetch edit history for this draft
            const [historyRows] = await pool.query(`
                SELECT 
                    h.id, h.draft_id, h.user_id, h.aksi, h.keterangan, 
                    DATE_FORMAT(h.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    COALESCE(pp.nama_lengkap, u.username, 'User') as user_nama
                FROM draft_jadwal_edit_history h
                LEFT JOIN users u ON h.user_id = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                WHERE h.draft_id = ?
                ORDER BY h.created_at DESC, h.id DESC
            `, [id]);

            res.json({
                success: true,
                data: {
                    ...draft,
                    teams: formattedTeams,
                    edit_history: historyRows
                }
            });
        } catch (err) {
            console.error('[getById Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengambil detail draft: ' + err.message });
        }
    },

    // 5. Create Draft (POP-UP AWAL: Nama Kegiatan, Jenis Kegiatan, Pembuatan Tim)
    create: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                nama_kegiatan,
                jenis_kegiatan_id,
                visibility,
                teams
            } = req.body;

            // Validations
            if (!nama_kegiatan || !nama_kegiatan.trim()) {
                return res.status(400).json({ success: false, message: 'Nama kegiatan wajib diisi' });
            }
            if (!jenis_kegiatan_id) {
                return res.status(400).json({ success: false, message: 'Jenis kegiatan wajib dipilih' });
            }

            const draftVisibility = (visibility === 'personal' || visibility === 'bidang') ? visibility : 'bidang';

            // Determine user's kota_kabupaten_id
            let kotaId = '3201';
            if (req.user && req.user.instansi_id) {
                const [inst] = await connection.query(
                    'SELECT kota_kabupaten_id FROM master_instansi_daerah WHERE id = ?',
                    [req.user.instansi_id]
                );
                if (inst.length > 0 && inst[0].kota_kabupaten_id) {
                    kotaId = String(inst[0].kota_kabupaten_id);
                }
            }

            // 1. Insert parent draft
            const userBidangId = req.user && req.user.bidang_id ? String(req.user.bidang_id) : null;
            const [draftResult] = await connection.query(`
                INSERT INTO draft_jadwal_kegiatan (
                    nama_kegiatan,
                    jenis_kegiatan_id,
                    kota_kabupaten_id,
                    bidang_ids,
                    status,
                    visibility,
                    created_by
                ) VALUES (?, ?, ?, ?, 'draft', ?, ?)
            `, [
                nama_kegiatan.trim(),
                jenis_kegiatan_id,
                kotaId,
                userBidangId,
                draftVisibility,
                req.user ? req.user.id : null
            ]);

            const newDraftId = draftResult.insertId;

            // 2. Insert Teams
            let teamList = [];
            if (Array.isArray(teams) && teams.length > 0) {
                teamList = teams.map(t => {
                    if (typeof t === 'string') return t.trim();
                    if (typeof t === 'object' && t.nama_tim) return t.nama_tim.trim();
                    return '';
                }).filter(Boolean);
            }

            // Default fallback if no teams provided
            if (teamList.length === 0) {
                teamList = ['Tim 1'];
            }

            for (const teamName of teamList) {
                await connection.query(`
                    INSERT INTO draft_jadwal_tim (
                        draft_id,
                        nama_tim,
                        kota_kabupaten_id,
                        status
                    ) VALUES (?, ?, ?, 'draft')
                `, [newDraftId, teamName, kotaId]);
            }

            await recordDraftHistory(
                connection,
                newDraftId,
                req.user ? req.user.id : null,
                'create',
                `Draft jadwal "${nama_kegiatan.trim()}" dibuat dengan ${teamList.length} tim`
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Draft jadwal berhasil dibuat',
                data: {
                    id: newDraftId,
                    total_teams: teamList.length
                }
            });
        } catch (err) {
            await connection.rollback();
            console.error('[create Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal membuat draft jadwal: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 6. Update Draft Basic Info (Nama Kegiatan, Jenis Kegiatan)
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { nama_kegiatan, jenis_kegiatan_id, visibility } = req.body;
            const validVisibility = (visibility === 'personal' || visibility === 'bidang') ? visibility : null;

            const [existing] = await pool.query('SELECT * FROM draft_jadwal_kegiatan WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan' });
            }

            // Authorization check if draft is already integrated
            const canModify = await checkCanModifyIntegratedDraft(pool, id, req.user);
            if (!canModify) {
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat mengubah jadwal terbit.'
                });
            }

            await pool.query(`
                UPDATE draft_jadwal_kegiatan SET
                    nama_kegiatan = COALESCE(?, nama_kegiatan),
                    jenis_kegiatan_id = COALESCE(?, jenis_kegiatan_id),
                    visibility = COALESCE(?, visibility),
                    updated_by = ?
                WHERE id = ?
            `, [
                nama_kegiatan ? nama_kegiatan.trim() : null,
                jenis_kegiatan_id || null,
                validVisibility,
                req.user ? req.user.id : null,
                id
            ]);

            // If already integrated, sync changes to official kegiatan_manajemen & employee logbooks
            if (existing[0].status === 'terintegrasi') {
                const [teams] = await pool.query(
                    'SELECT id, nama_tim, kegiatan_manajemen_id FROM draft_jadwal_tim WHERE draft_id = ? AND kegiatan_manajemen_id IS NOT NULL',
                    [id]
                );
                const isMultiple = teams.length > 1;
                for (const t of teams) {
                    const officialTitle = isMultiple && nama_kegiatan
                        ? `${nama_kegiatan.trim()} - ${t.nama_tim}`
                        : (nama_kegiatan ? nama_kegiatan.trim() : null);
                    await pool.query(`
                        UPDATE kegiatan_manajemen SET
                            nama_kegiatan = COALESCE(?, nama_kegiatan),
                            jenis_kegiatan_id = COALESCE(?, jenis_kegiatan_id)
                        WHERE id = ?
                    `, [officialTitle, jenis_kegiatan_id || null, t.kegiatan_manajemen_id]);
                    await syncToKegiatanPegawai(pool, t.kegiatan_manajemen_id);
                }
            }

            await recordDraftHistory(
                pool,
                id,
                req.user ? req.user.id : null,
                'edit',
                `Memperbarui informasi judul/jenis draft kegiatan`
            );

            res.json({ success: true, message: 'Informasi draft kegiatan berhasil diperbarui' });
        } catch (err) {
            console.error('[update Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal memperbarui draft: ' + err.message });
        }
    },

    // 7. Soft Delete Draft (Move to Trash)
    remove: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;

            // Fetch draft info
            const [draftRows] = await connection.query('SELECT * FROM draft_jadwal_kegiatan WHERE id = ? AND is_deleted = 0', [id]);
            if (draftRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan atau sudah dihapus' });
            }
            const draft = draftRows[0];

            if (draft.status === 'terintegrasi') {
                const canModify = await checkCanModifyIntegratedDraft(connection, id, req.user);
                if (!canModify) {
                    await connection.rollback();
                    return res.status(403).json({
                        success: false,
                        message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat menghapus draft jadwal yang sudah terbit.'
                    });
                }
            }

            // Clean up any linked official kegiatan and employee logbooks
            const [linkedTeams] = await connection.query('SELECT kegiatan_manajemen_id FROM draft_jadwal_tim WHERE draft_id = ?', [id]);
            for (const t of linkedTeams) {
                if (t.kegiatan_manajemen_id) {
                    await connection.query('UPDATE kegiatan_manajemen SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [t.kegiatan_manajemen_id]);
                    await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(t.kegiatan_manajemen_id)]);
                }
            }

            // Soft delete teams
            await connection.query(
                'UPDATE draft_jadwal_tim SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE draft_id = ?',
                [req.user ? req.user.id : null, id]
            );

            // Soft delete draft
            await connection.query(
                'UPDATE draft_jadwal_kegiatan SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?',
                [req.user ? req.user.id : null, id]
            );

            // Get user's full name for description
            let actorName = req.user?.nama_lengkap || req.user?.nama || req.user?.username || 'Pengguna';
            if (req.user?.profil_pegawai_id) {
                const [actorRows] = await connection.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [req.user.profil_pegawai_id]);
                if (actorRows.length > 0 && actorRows[0].nama_lengkap) {
                    actorName = actorRows[0].nama_lengkap;
                }
            }

            const deleteDesc = draft.status === 'terintegrasi'
                ? `Draft kegiatan (status terbit) dipindahkan ke Tempat Sampah oleh ${actorName}. Seluruh penugasan logbook dinonaktifkan sementara.`
                : `Draft kegiatan dipindahkan ke Tempat Sampah oleh ${actorName}`;

            await recordDraftHistory(
                connection,
                id,
                req.user ? req.user.id : null,
                'hapus',
                deleteDesc
            );

            await connection.commit();
            res.json({ success: true, message: 'Draft jadwal berhasil dipindahkan ke Tempat Sampah' });
        } catch (err) {
            await connection.rollback();
            console.error('[remove Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal memindahkan draft jadwal ke tempat sampah: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 7b. Restore Draft from Trash
    restore: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;

            // Fetch trashed draft info
            const [draftRows] = await connection.query('SELECT * FROM draft_jadwal_kegiatan WHERE id = ? AND is_deleted = 1', [id]);
            if (draftRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan di Tempat Sampah' });
            }
            const draft = draftRows[0];

            // Restore draft
            await connection.query(
                'UPDATE draft_jadwal_kegiatan SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?',
                [id]
            );

            // Restore teams
            await connection.query(
                'UPDATE draft_jadwal_tim SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE draft_id = ?',
                [id]
            );

            // If draft was terintegrasi, restore linked official kegiatan and sync to employee logbooks!
            const [linkedTeams] = await connection.query('SELECT kegiatan_manajemen_id FROM draft_jadwal_tim WHERE draft_id = ?', [id]);
            for (const t of linkedTeams) {
                if (t.kegiatan_manajemen_id) {
                    await connection.query('UPDATE kegiatan_manajemen SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [t.kegiatan_manajemen_id]);
                    await syncToKegiatanPegawai(connection, t.kegiatan_manajemen_id);
                }
            }

            // Get user's full name
            let actorName = req.user?.nama_lengkap || req.user?.nama || req.user?.username || 'Pengguna';
            if (req.user?.profil_pegawai_id) {
                const [actorRows] = await connection.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [req.user.profil_pegawai_id]);
                if (actorRows.length > 0 && actorRows[0].nama_lengkap) {
                    actorName = actorRows[0].nama_lengkap;
                }
            }

            const restoreDesc = draft.status === 'terintegrasi'
                ? `Draft kegiatan dipulihkan dari Tempat Sampah oleh ${actorName}. Jadwal resmi dan logbook seluruh petugas diaktifkan kembali.`
                : `Draft kegiatan dipulihkan dari Tempat Sampah oleh ${actorName}`;

            await recordDraftHistory(
                connection,
                id,
                req.user ? req.user.id : null,
                'pulihkan',
                restoreDesc
            );

            await connection.commit();
            res.json({ success: true, message: 'Draft jadwal berhasil dipulihkan' });
        } catch (err) {
            await connection.rollback();
            console.error('[restore Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal memulihkan draft jadwal: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 7c. Permanently Delete Draft
    permanentDelete: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;

            const [draftRows] = await connection.query('SELECT * FROM draft_jadwal_kegiatan WHERE id = ? AND is_deleted = 1', [id]);
            if (draftRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft tidak ditemukan di Tempat Sampah' });
            }
            const draft = draftRows[0];

            if (draft.status === 'terintegrasi') {
                const canModify = await checkCanModifyIntegratedDraft(connection, id, req.user);
                if (!canModify) {
                    await connection.rollback();
                    return res.status(403).json({
                        success: false,
                        message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat menghapus permanen draft jadwal yang sudah terbit.'
                    });
                }
            }

            // Clean up linked official kegiatan and employee logbooks
            const [linkedTeams] = await connection.query('SELECT kegiatan_manajemen_id FROM draft_jadwal_tim WHERE draft_id = ?', [id]);
            for (const t of linkedTeams) {
                if (t.kegiatan_manajemen_id) {
                    await connection.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [t.kegiatan_manajemen_id]);
                    await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(t.kegiatan_manajemen_id)]);
                }
            }

            // Permanently delete teams
            await connection.query('DELETE FROM draft_jadwal_tim WHERE draft_id = ?', [id]);

            // Permanently delete history
            await connection.query('DELETE FROM draft_jadwal_edit_history WHERE draft_id = ?', [id]);

            // Permanently delete draft
            await connection.query('DELETE FROM draft_jadwal_kegiatan WHERE id = ?', [id]);

            await connection.commit();
            res.json({ success: true, message: 'Draft jadwal berhasil dihapus secara permanen' });
        } catch (err) {
            await connection.rollback();
            console.error('[permanentDelete Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal menghapus permanen draft: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // ================= TEAM MANAGEMENT =================

    // 8. Add a Team to existing Draft
    addTeam: async (req, res) => {
        try {
            const { id } = req.params; // draft_id
            const { 
                nama_tim, 
                tanggal_mulai, 
                tanggal_akhir, 
                kecamatan_id, 
                lokasi_detail, 
                petugas_ids, 
                keterangan 
            } = req.body;

            const [draftRows] = await pool.query('SELECT kota_kabupaten_id FROM draft_jadwal_kegiatan WHERE id = ?', [id]);
            if (draftRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Draft tidak ditemukan' });
            }

            // Authorization check if draft is already integrated
            const canModify = await checkCanModifyIntegratedDraft(pool, id, req.user);
            if (!canModify) {
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat menambah jadwal pada draft terbit.'
                });
            }

            const teamName = (nama_tim && nama_tim.trim()) ? nama_tim.trim() : 'Tim Baru';
            const kotaId = draftRows[0].kota_kabupaten_id || '3201';
            const pIds = Array.isArray(petugas_ids) 
                ? petugas_ids.join(',') 
                : (petugas_ids ? String(petugas_ids) : null);

            let kIds = null;
            if (Array.isArray(kecamatan_id)) {
                kIds = kecamatan_id.map(s => String(s).trim()).filter(Boolean).join(',') || null;
            } else if (kecamatan_id) {
                kIds = String(kecamatan_id).trim() || null;
            }

            // Date overlap validation within the same draft and team name
            if (tanggal_mulai) {
                const start = tanggal_mulai;
                const end = tanggal_akhir || start;
                const [overlapRows] = await pool.query(`
                    SELECT nama_tim, 
                           DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') as t_mulai, 
                           DATE_FORMAT(COALESCE(tanggal_akhir, tanggal_mulai), '%Y-%m-%d') as t_akhir
                    FROM draft_jadwal_tim
                    WHERE draft_id = ?
                      AND is_deleted = 0
                      AND LOWER(TRIM(nama_tim)) = LOWER(?)
                      AND tanggal_mulai IS NOT NULL
                      AND (tanggal_mulai <= ? AND COALESCE(tanggal_akhir, tanggal_mulai) >= ?)
                    LIMIT 1
                `, [id, teamName, end, start]);

                if (overlapRows.length > 0) {
                    const ov = overlapRows[0];
                    const existingDateStr = ov.t_mulai === ov.t_akhir ? ov.t_mulai : `${ov.t_mulai} s.d. ${ov.t_akhir}`;
                    return res.status(400).json({
                        success: false,
                        message: `Jadwal untuk "${teamName}" pada tanggal ${start === end ? start : `${start} s.d. ${end}`} tumpang tindih dengan jadwal yang sudah ada (${existingDateStr}). Mohon periksa kembali agar tidak terjadi jadwal ganda.`
                    });
                }
            }

            const [result] = await pool.query(`
                INSERT INTO draft_jadwal_tim (
                    draft_id, nama_tim, tanggal_mulai, tanggal_akhir,
                    kota_kabupaten_id, kecamatan_id, lokasi_detail,
                    petugas_ids, keterangan, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
            `, [
                id, 
                teamName, 
                tanggal_mulai || null, 
                tanggal_akhir || tanggal_mulai || null, 
                kotaId, 
                kIds, 
                lokasi_detail ? lokasi_detail.trim() : null, 
                pIds, 
                keterangan ? keterangan.trim() : null
            ]);

            await recordDraftHistory(
                pool,
                id,
                req.user ? req.user.id : null,
                'tambah_tim',
                `Menambahkan tim baru "${teamName}" ke draft jadwal`
            );

            res.status(201).json({
                success: true,
                message: `Tim "${teamName}" berhasil ditambahkan ke draft`,
                data: { id: result.insertId, nama_tim: teamName }
            });
        } catch (err) {
            console.error('[addTeam Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal menambahkan tim: ' + err.message });
        }
    },

    // 9. Update Team Schedule & Officers (Tanggal, Lokasi, Pegawai, Keterangan)
    updateTeam: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { teamId } = req.params;
            const {
                nama_tim,
                tanggal_mulai,
                tanggal_akhir,
                kecamatan_id,
                lokasi_detail,
                petugas_ids,
                keterangan
            } = req.body;

            const [teamRows] = await connection.query('SELECT * FROM draft_jadwal_tim WHERE id = ?', [teamId]);
            if (teamRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Tim tidak ditemukan' });
            }

            const existing = teamRows[0];

            // Authorization check if draft is already integrated
            const canModify = await checkCanModifyIntegratedDraft(connection, existing.draft_id, req.user);
            if (!canModify) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat mengubah jadwal terbit.'
                });
            }

            const startDate = tanggal_mulai || existing.tanggal_mulai;
            const endDate = tanggal_akhir || startDate;

            // Sanitize petugas_ids
            let assignedIds = [];
            if (Array.isArray(petugas_ids)) {
                assignedIds = petugas_ids.map(Number).filter(n => !isNaN(n) && n > 0);
            } else if (petugas_ids !== undefined) {
                assignedIds = String(petugas_ids).split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            } else if (existing.petugas_ids) {
                assignedIds = String(existing.petugas_ids).split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            }

            // Check DL conflict validation if startDate and assigned officers exist (excluding this team's own activity)
            if (startDate && assignedIds.length > 0) {
                const currentKegId = existing.kegiatan_manajemen_id || 0;
                const [dlConflicts] = await connection.query(`
                    SELECT 
                        khp.profil_pegawai_id,
                        pp.nama_lengkap,
                        DATE_FORMAT(khp.tanggal, '%Y-%m-%d') as tanggal,
                        khp.nama_kegiatan
                    FROM kegiatan_harian_pegawai khp
                    JOIN profil_pegawai pp ON khp.profil_pegawai_id = pp.id
                    LEFT JOIN master_tipe_kegiatan mtk ON khp.tipe_kegiatan = mtk.kode
                    WHERE khp.profil_pegawai_id IN (?)
                    AND khp.tanggal BETWEEN ? AND ?
                    AND (khp.id_kegiatan_eksternal IS NULL OR khp.id_kegiatan_eksternal != ?)
                    AND (khp.tipe_kegiatan IN ('DL', 'DLB') OR mtk.nama IN ('Dinas Luar', 'DL Luar Bidang'))
                    LIMIT 1
                `, [assignedIds, startDate, endDate, String(currentKegId)]);

                if (dlConflicts.length > 0) {
                    const conf = dlConflicts[0];
                    return res.status(400).json({
                        success: false,
                        message: `Petugas "${conf.nama_lengkap}" sudah memiliki tugas Dinas Luar (${conf.nama_kegiatan}) pada tanggal ${conf.tanggal} dan tidak dapat dipilih.`
                    });
                }
            }

            const targetTeamName = nama_tim ? nama_tim.trim() : existing.nama_tim;

            // Date overlap validation within the same draft and team name (prevent clashing / overwriting other schedule rows)
            if (startDate) {
                const [overlapRows] = await connection.query(`
                    SELECT nama_tim, 
                           DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') as t_mulai, 
                           DATE_FORMAT(COALESCE(tanggal_akhir, tanggal_mulai), '%Y-%m-%d') as t_akhir
                    FROM draft_jadwal_tim
                    WHERE draft_id = ?
                      AND id != ?
                      AND is_deleted = 0
                      AND LOWER(TRIM(nama_tim)) = LOWER(?)
                      AND tanggal_mulai IS NOT NULL
                      AND (tanggal_mulai <= ? AND COALESCE(tanggal_akhir, tanggal_mulai) >= ?)
                    LIMIT 1
                `, [existing.draft_id, teamId, targetTeamName, endDate, startDate]);

                if (overlapRows.length > 0) {
                    const ov = overlapRows[0];
                    const existingDateStr = ov.t_mulai === ov.t_akhir ? ov.t_mulai : `${ov.t_mulai} s.d. ${ov.t_akhir}`;
                    const targetDateStr = startDate === endDate ? startDate : `${startDate} s.d. ${endDate}`;
                    return res.status(400).json({
                        success: false,
                        message: `Tanggal yang dipilih (${targetDateStr}) untuk "${targetTeamName}" menimpa/tumpang tindih dengan jadwal yang sudah ada (${existingDateStr}) pada draft ini. Mohon gunakan tanggal lain atau hapus jadwal yang bertabrakan terlebih dahulu.`
                    });
                }
            }

            let targetKecId = existing.kecamatan_id;
            if (kecamatan_id !== undefined) {
                if (Array.isArray(kecamatan_id)) {
                    targetKecId = kecamatan_id.map(s => String(s).trim()).filter(Boolean).join(',') || null;
                } else if (kecamatan_id) {
                    targetKecId = String(kecamatan_id).trim() || null;
                } else {
                    targetKecId = null;
                }
            }
            const targetLokasiDetail = lokasi_detail !== undefined ? (lokasi_detail ? lokasi_detail.trim() : null) : existing.lokasi_detail;
            const targetKeterangan = keterangan !== undefined ? (keterangan ? keterangan.trim() : null) : existing.keterangan;

            await connection.query(`
                UPDATE draft_jadwal_tim SET
                    nama_tim = ?,
                    tanggal_mulai = ?,
                    tanggal_akhir = ?,
                    kecamatan_id = ?,
                    lokasi_detail = ?,
                    petugas_ids = ?,
                    keterangan = ?
                WHERE id = ?
            `, [
                targetTeamName,
                startDate || null,
                endDate || null,
                targetKecId,
                targetLokasiDetail,
                assignedIds.length > 0 ? assignedIds.join(',') : null,
                targetKeterangan,
                teamId
            ]);

            // If already integrated, sync changes to official kegiatan_manajemen & employee logbooks
            if (existing.status === 'terintegrasi' && existing.kegiatan_manajemen_id) {
                const [draftRows] = await connection.query('SELECT nama_kegiatan FROM draft_jadwal_kegiatan WHERE id = ?', [existing.draft_id]);
                const draft = draftRows[0];

                const [totalTeamsRows] = await connection.query('SELECT COUNT(*) as count FROM draft_jadwal_tim WHERE draft_id = ?', [existing.draft_id]);
                const isMultipleTeams = totalTeamsRows[0].count > 1;
                const officialNamaKegiatan = isMultipleTeams 
                    ? `${draft ? draft.nama_kegiatan : ''} - ${targetTeamName}`
                    : (draft ? draft.nama_kegiatan : targetTeamName);

                let calculatedBidangIds = '';
                if (assignedIds.length > 0) {
                    const [bidangRows] = await connection.query(
                        'SELECT DISTINCT bidang_id FROM profil_pegawai WHERE id IN (?) AND bidang_id IS NOT NULL',
                        [assignedIds]
                    );
                    if (bidangRows.length > 0) {
                        calculatedBidangIds = bidangRows.map(r => r.bidang_id).join(',');
                    }
                }

                let targetKecNama = '';
                if (targetKecId) {
                    const kIds = String(targetKecId).split(',').map(s => s.trim()).filter(Boolean);
                    if (kIds.length > 0) {
                        const [kecRows] = await connection.query('SELECT id, nama FROM master_kecamatan WHERE id IN (?)', [kIds]);
                        const kMap = {};
                        kecRows.forEach(r => { kMap[String(r.id)] = r.nama; });
                        targetKecNama = kIds.map(id => kMap[id]).filter(Boolean).join(', ');
                    }
                }

                let lokasiPrefix = '';
                if (targetKecNama) {
                    lokasiPrefix = `[Kec. ${targetKecNama}${targetLokasiDetail ? ' - ' + targetLokasiDetail : ''}]`;
                } else if (targetLokasiDetail) {
                    lokasiPrefix = `[Lokasi: ${targetLokasiDetail}]`;
                }
                const combinedKeterangan = [lokasiPrefix, targetKeterangan].filter(Boolean).join(' ');

                await connection.query(`
                    UPDATE kegiatan_manajemen SET
                        tanggal = ?,
                        tanggal_akhir = ?,
                        nama_kegiatan = ?,
                        petugas_ids = ?,
                        bidang_ids = COALESCE(NULLIF(?, ''), bidang_ids),
                        keterangan = ?
                    WHERE id = ?
                `, [
                    startDate,
                    endDate,
                    officialNamaKegiatan,
                    assignedIds.join(','),
                    calculatedBidangIds,
                    combinedKeterangan,
                    existing.kegiatan_manajemen_id
                ]);

                await syncToKegiatanPegawai(connection, existing.kegiatan_manajemen_id);

                await connection.query(`
                    INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan)
                    VALUES (?, ?, 'edit', ?)
                `, [
                    existing.kegiatan_manajemen_id,
                    req.user ? req.user.id : null,
                    `Jadwal/petugas diperbarui melalui modul Draft Jadwal (Tim: ${targetTeamName})`
                ]);
            }

            // Record edit history in draft
            const descParts = [];
            if (targetTeamName !== existing.nama_tim) descParts.push(`nama tim (${targetTeamName})`);
            if (startDate !== existing.tanggal_mulai || endDate !== existing.tanggal_akhir) descParts.push('jadwal tanggal');
            if (targetKecId !== existing.kecamatan_id || targetLokasiDetail !== existing.lokasi_detail) descParts.push('lokasi');
            if (assignedIds.join(',') !== (existing.petugas_ids || '')) descParts.push(`petugas (${assignedIds.length} orang)`);
            if (targetKeterangan !== existing.keterangan) descParts.push('keterangan');

            const editDesc = descParts.length > 0 
                ? `Mengubah tim "${targetTeamName}": ` + descParts.join(', ')
                : `Mengubah data tim "${targetTeamName}"`;

            await recordDraftHistory(
                connection,
                existing.draft_id,
                req.user ? req.user.id : null,
                'edit',
                editDesc
            );

            await connection.commit();

            res.json({ success: true, message: 'Jadwal dan rincian tim berhasil diperbarui' });
        } catch (err) {
            await connection.rollback();
            console.error('[updateTeam Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal memperbarui rincian tim: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 10. Delete a Team (Soft Delete)
    deleteTeam: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { teamId } = req.params;

            const [teamRows] = await connection.query('SELECT * FROM draft_jadwal_tim WHERE id = ? AND is_deleted = 0', [teamId]);
            if (teamRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Tim tidak ditemukan atau sudah dihapus' });
            }

            const team = teamRows[0];

            // Authorization check if draft is already integrated
            const canModify = await checkCanModifyIntegratedDraft(connection, team.draft_id, req.user);
            if (!canModify) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat menghapus tim pada jadwal terbit.'
                });
            }

            // Check if it's the last active team in the draft
            const [countRows] = await connection.query('SELECT COUNT(*) as count FROM draft_jadwal_tim WHERE draft_id = ? AND is_deleted = 0', [team.draft_id]);
            if (countRows[0].count <= 1) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Minimal harus ada 1 tim dalam satu draft jadwal. Hapus seluruh draft jika ingin membatalkannya.' });
            }

            // If team is integrated, clean up linked official kegiatan & employee logbooks
            if (team.kegiatan_manajemen_id) {
                await connection.query('UPDATE kegiatan_manajemen SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [team.kegiatan_manajemen_id]);
                await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(team.kegiatan_manajemen_id)]);
            }

            // Soft delete team
            await connection.query(
                'UPDATE draft_jadwal_tim SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?',
                [req.user ? req.user.id : null, teamId]
            );

            // Get actor name
            let actorName = req.user?.nama_lengkap || req.user?.nama || req.user?.username || 'Pengguna';
            if (req.user?.profil_pegawai_id) {
                const [actorRows] = await connection.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [req.user.profil_pegawai_id]);
                if (actorRows.length > 0 && actorRows[0].nama_lengkap) {
                    actorName = actorRows[0].nama_lengkap;
                }
            }

            await recordDraftHistory(
                connection,
                team.draft_id,
                req.user ? req.user.id : null,
                'hapus_tim',
                `Menghapus tim "${team.nama_tim}" dari draft jadwal oleh ${actorName}`
            );

            await connection.commit();
            res.json({ success: true, message: 'Tim berhasil dihapus dari draft' });
        } catch (err) {
            await connection.rollback();
            console.error('[deleteTeam Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal menghapus tim: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 10b. Delete an Entire Team Column by Name (Soft Delete all schedules for that team name)
    deleteTeamByName: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { namaTim } = req.body;

            if (!namaTim || !namaTim.trim()) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Nama tim harus disertakan' });
            }

            const cleanName = namaTim.trim();

            const [draftRows] = await connection.query('SELECT * FROM draft_jadwal_kegiatan WHERE id = ? AND is_deleted = 0', [id]);
            if (draftRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan' });
            }

            // Authorization check if draft is integrated
            const canModify = await checkCanModifyIntegratedDraft(connection, id, req.user);
            if (!canModify) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat menghapus tim pada jadwal terbit.'
                });
            }

            // Check if there are other unique team names in this draft
            const [distinctTeams] = await connection.query(
                'SELECT DISTINCT nama_tim FROM draft_jadwal_tim WHERE draft_id = ? AND is_deleted = 0',
                [id]
            );

            if (distinctTeams.length <= 1) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Minimal harus ada 1 tim dalam satu draft jadwal. Hapus seluruh draft jika ingin membatalkannya.'
                });
            }

            // Find all team rows matching this team name
            const [targetTeams] = await connection.query(
                'SELECT id, kegiatan_manajemen_id FROM draft_jadwal_tim WHERE draft_id = ? AND nama_tim = ? AND is_deleted = 0',
                [id, cleanName]
            );

            if (targetTeams.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: `Tim "${cleanName}" tidak ditemukan atau sudah dihapus` });
            }

            // If any rows have linked kegiatan_manajemen, clean them up
            for (const t of targetTeams) {
                if (t.kegiatan_manajemen_id) {
                    await connection.query('UPDATE kegiatan_manajemen SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [t.kegiatan_manajemen_id]);
                    await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(t.kegiatan_manajemen_id)]);
                }
            }

            // Soft delete all matching team rows
            await connection.query(
                'UPDATE draft_jadwal_tim SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE draft_id = ? AND nama_tim = ? AND is_deleted = 0',
                [req.user ? req.user.id : null, id, cleanName]
            );

            // Get actor name
            let actorName = req.user?.nama_lengkap || req.user?.nama || req.user?.username || 'Pengguna';
            if (req.user?.profil_pegawai_id) {
                const [actorRows] = await connection.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [req.user.profil_pegawai_id]);
                if (actorRows.length > 0 && actorRows[0].nama_lengkap) {
                    actorName = actorRows[0].nama_lengkap;
                }
            }

            await recordDraftHistory(
                connection,
                id,
                req.user ? req.user.id : null,
                'hapus_tim',
                `Menghapus seluruh kolom "${cleanName}" dari draft jadwal oleh ${actorName}`
            );

            await connection.commit();
            res.json({ success: true, message: `Tim "${cleanName}" berhasil dihapus dari draft` });
        } catch (err) {
            await connection.rollback();
            console.error('[deleteTeamByName Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal menghapus tim: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 11. Integrate Single Team to Official Kegiatan
    integrateTeam: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { teamId } = req.params;

            // 1. Get team info with draft and kecamatan
            const [teamRows] = await connection.query(`
                SELECT 
                    t.*,
                    d.nama_kegiatan,
                    d.jenis_kegiatan_id,
                    mk.nama as kecamatan_nama
                FROM draft_jadwal_tim t
                JOIN draft_jadwal_kegiatan d ON t.draft_id = d.id
                LEFT JOIN master_kecamatan mk ON t.kecamatan_id = mk.id
                WHERE t.id = ?
            `, [teamId]);

            if (teamRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Tim tidak ditemukan' });
            }

            const team = teamRows[0];

            // Resolve multi-kecamatan names if present
            const kIds = team.kecamatan_id ? String(team.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean) : [];
            if (kIds.length > 0) {
                const [kecRows] = await connection.query('SELECT id, nama FROM master_kecamatan WHERE id IN (?)', [kIds]);
                const kMap = {};
                kecRows.forEach(r => { kMap[String(r.id)] = r.nama; });
                const combinedKec = kIds.map(id => kMap[id]).filter(Boolean).join(', ');
                if (combinedKec) team.kecamatan_nama = combinedKec;
            }

            if (team.status === 'terintegrasi') {
                return res.status(400).json({
                    success: false,
                    message: 'Tim ini sudah terintegrasi ke Daftar Kegiatan sebelumnya (ID: ' + team.kegiatan_manajemen_id + ')'
                });
            }

            // Validate readiness
            if (!team.tanggal_mulai) {
                return res.status(400).json({ success: false, message: 'Tanggal tim belum diatur' });
            }
            if (!team.kecamatan_id) {
                return res.status(400).json({ success: false, message: 'Kecamatan tujuan tim belum dipilih' });
            }

            const assignedIds = team.petugas_ids ? team.petugas_ids.split(',').map(Number).filter(Boolean) : [];
            if (assignedIds.length === 0) {
                return res.status(400).json({ success: false, message: 'Tim ini belum memiliki petugas yang ditugaskan' });
            }

            // 2. Final DL Conflict Check
            const [dlConflicts] = await connection.query(`
                SELECT 
                    khp.profil_pegawai_id,
                    pp.nama_lengkap,
                    DATE_FORMAT(khp.tanggal, '%Y-%m-%d') as tanggal,
                    khp.nama_kegiatan
                FROM kegiatan_harian_pegawai khp
                JOIN profil_pegawai pp ON khp.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_kegiatan mtk ON khp.tipe_kegiatan = mtk.kode
                WHERE khp.profil_pegawai_id IN (?)
                AND khp.tanggal BETWEEN ? AND ?
                AND (khp.tipe_kegiatan IN ('DL', 'DLB') OR mtk.nama IN ('Dinas Luar', 'DL Luar Bidang'))
                LIMIT 1
            `, [assignedIds, team.tanggal_mulai, team.tanggal_akhir || team.tanggal_mulai]);

            if (dlConflicts.length > 0) {
                const conf = dlConflicts[0];
                return res.status(400).json({
                    success: false,
                    message: `Gagal integrasi: Petugas "${conf.nama_lengkap}" saat ini sudah memiliki tugas Dinas Luar (${conf.nama_kegiatan}) pada tanggal ${conf.tanggal}.`
                });
            }

            // 3. Count total teams in draft to format name
            const [totalTeamsRows] = await connection.query('SELECT COUNT(*) as count FROM draft_jadwal_tim WHERE draft_id = ?', [team.draft_id]);
            const isMultipleTeams = totalTeamsRows[0].count > 1;

            const officialNamaKegiatan = isMultipleTeams 
                ? `${team.nama_kegiatan} - ${team.nama_tim}`
                : team.nama_kegiatan;

            // 4. Calculate bidang_ids
            let calculatedBidangIds = '';
            const [bidangRows] = await connection.query(
                'SELECT DISTINCT bidang_id FROM profil_pegawai WHERE id IN (?) AND bidang_id IS NOT NULL',
                [assignedIds]
            );
            if (bidangRows.length > 0) {
                calculatedBidangIds = bidangRows.map(r => r.bidang_id).join(',');
            } else if (req.user && req.user.bidang_id) {
                calculatedBidangIds = String(req.user.bidang_id);
            }

            // 5. Notes & Location
            let lokasiPrefix = '';
            if (team.kecamatan_nama) {
                lokasiPrefix = `[Kec. ${team.kecamatan_nama}${team.lokasi_detail ? ' - ' + team.lokasi_detail : ''}]`;
            } else if (team.lokasi_detail) {
                lokasiPrefix = `[Lokasi: ${team.lokasi_detail}]`;
            }

            const combinedKeterangan = [lokasiPrefix, team.keterangan].filter(Boolean).join(' ');

            // 6. Instansi Penyelenggara
            let instansiPenyelenggara = req.user?.instansi_nama || 'Internal';
            if (req.user && req.user.instansi_id) {
                const [instRows] = await connection.query('SELECT instansi FROM master_instansi_daerah WHERE id = ?', [req.user.instansi_id]);
                if (instRows.length > 0 && instRows[0].instansi) {
                    instansiPenyelenggara = instRows[0].instansi;
                }
            }

            // 7. Insert into kegiatan_manajemen
            const [kegiatanResult] = await connection.query(`
                INSERT INTO kegiatan_manajemen (
                    tanggal,
                    tanggal_akhir,
                    nama_kegiatan,
                    jenis_kegiatan_id,
                    bidang_ids,
                    instansi_penyelenggara,
                    petugas_ids,
                    kelengkapan,
                    keterangan,
                    sesi,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Full Day', ?)
            `, [
                team.tanggal_mulai,
                team.tanggal_akhir || team.tanggal_mulai,
                officialNamaKegiatan,
                team.jenis_kegiatan_id,
                calculatedBidangIds,
                instansiPenyelenggara,
                assignedIds.join(','),
                combinedKeterangan,
                req.user ? req.user.id : null
            ]);

            const newKegiatanId = kegiatanResult.insertId;

            // 8. Record history
            await connection.query(`
                INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan)
                VALUES (?, ?, 'create', ?)
            `, [
                newKegiatanId,
                req.user ? req.user.id : null,
                `Kegiatan resmi dibuat via Integrasi Draft Jadwal (Draft #${team.draft_id}, Tim: ${team.nama_tim})`
            ]);

            // 9. Sync directly to Individual Employee Logbook (kegiatan_harian_pegawai)
            await syncToKegiatanPegawai(connection, newKegiatanId);

            // 10. Update team status
            await connection.query(`
                UPDATE draft_jadwal_tim SET
                    status = 'terintegrasi',
                    kegiatan_manajemen_id = ?
                WHERE id = ?
            `, [newKegiatanId, teamId]);

            // 10b. Send inbox notifications to assigned officers
            for (const pid of assignedIds) {
                try {
                    const [userRows] = await connection.query('SELECT id FROM users WHERE profil_pegawai_id = ?', [pid]);
                    if (userRows.length > 0) {
                        const recipientUserId = userRows[0].id;
                        const notifTitle = `Penugasan Lapangan: ${officialNamaKegiatan}`;
                        const notifMsg = `Jadwal penugasan Anda untuk kegiatan "${officialNamaKegiatan}" (${team.nama_tim}) di ${team.kecamatan_nama || 'Lokasi Kegiatan'} pada tanggal ${team.tanggal_mulai} telah disetujui dan diterbitkan ke logbook.`;
                        await notificationService.send(recipientUserId, notifTitle, notifMsg, 'jadwal_tim', `kegiatan:${newKegiatanId}`);
                    }
                } catch (notifErr) {
                    console.error('[Notification send error]:', notifErr);
                }
            }

            // 11. Check if all teams in draft are now integrated
            const [unintegratedRows] = await connection.query(
                "SELECT COUNT(*) as count FROM draft_jadwal_tim WHERE draft_id = ? AND status != 'terintegrasi'",
                [team.draft_id]
            );

            if (unintegratedRows[0].count === 0) {
                await connection.query(`
                    UPDATE draft_jadwal_kegiatan SET
                        status = 'terintegrasi',
                        kegiatan_manajemen_id = ?,
                        updated_by = ?
                    WHERE id = ?
                `, [newKegiatanId, req.user ? req.user.id : null, team.draft_id]);
            }

            await connection.commit();

            res.json({
                success: true,
                message: `Tim "${team.nama_tim}" berhasil diintegrasikan ke Daftar Kegiatan, Rekap, dan Logbook Pegawai!`,
                data: {
                    team_id: Number(teamId),
                    draft_id: team.draft_id,
                    kegiatan_id: newKegiatanId
                }
            });
        } catch (err) {
            await connection.rollback();
            console.error('[integrateTeam Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengintegrasikan tim: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 12. Helper to execute draft integration to official kegiatan & logbook
    executeDraftIntegration: async (connection, id, approverUser, catatan = '') => {
        // Get all unintegrated teams of this draft
        const [teams] = await connection.query(`
            SELECT 
                t.*,
                d.nama_kegiatan,
                d.jenis_kegiatan_id,
                mk.nama as kecamatan_nama
            FROM draft_jadwal_tim t
            JOIN draft_jadwal_kegiatan d ON t.draft_id = d.id
            LEFT JOIN master_kecamatan mk ON t.kecamatan_id = mk.id
            WHERE t.draft_id = ? AND t.status != 'terintegrasi'
            ORDER BY t.id ASC
        `, [id]);

        if (teams.length === 0) {
            throw new Error('Seluruh tim pada draft ini sudah terintegrasi sebelumnya.');
        }

        // Check if any team is missing requirements
        const unready = teams.filter(t => !t.tanggal_mulai || !t.kecamatan_id || !t.petugas_ids);
        if (unready.length > 0) {
            const names = unready.map(t => `"${t.nama_tim}"`).join(', ');
            throw new Error(`Tim ${names} belum lengkap (tanggal, kecamatan, atau petugas belum diatur). Lengkapi terlebih dahulu.`);
        }

        const [totalTeamsRows] = await connection.query('SELECT COUNT(*) as count FROM draft_jadwal_tim WHERE draft_id = ?', [id]);
        const isMultipleTeams = totalTeamsRows[0].count > 1;

        // Batch resolve all unique kecamatan, officers, and date range across teams
        const allKecIds = new Set();
        const allAssignedOfficerIds = new Set();
        let overallStartDate = null;
        let overallEndDate = null;

        teams.forEach(t => {
            if (t.kecamatan_id) {
                String(t.kecamatan_id).split(',').forEach(kid => {
                    const trimmed = kid.trim();
                    if (trimmed) allKecIds.add(trimmed);
                });
            }
            if (t.petugas_ids) {
                String(t.petugas_ids).split(',').forEach(id => {
                    const num = Number(id.trim());
                    if (num > 0) allAssignedOfficerIds.add(num);
                });
            }
            if (t.tanggal_mulai) {
                if (!overallStartDate || t.tanggal_mulai < overallStartDate) overallStartDate = t.tanggal_mulai;
                const tEnd = t.tanggal_akhir || t.tanggal_mulai;
                if (!overallEndDate || tEnd > overallEndDate) overallEndDate = tEnd;
            }
        });

        let batchKecMap = {};
        if (allKecIds.size > 0) {
            const [kecRows] = await connection.query('SELECT id, nama FROM master_kecamatan WHERE id IN (?)', [Array.from(allKecIds)]);
            kecRows.forEach(r => { batchKecMap[String(r.id)] = r.nama; });
        }

        // Batch load users & profil for all officers in ONE query
        const officerUserMap = new Map();
        const officerBidangMap = new Map();
        if (allAssignedOfficerIds.size > 0) {
            const [officerRows] = await connection.query(`
                SELECT pp.id as profil_id, pp.bidang_id, u.id as user_id
                FROM profil_pegawai pp
                LEFT JOIN users u ON u.profil_pegawai_id = pp.id
                WHERE pp.id IN (?)
            `, [Array.from(allAssignedOfficerIds)]);
            officerRows.forEach(r => {
                if (r.user_id) officerUserMap.set(r.profil_id, r.user_id);
                if (r.bidang_id) officerBidangMap.set(r.profil_id, r.bidang_id);
            });
        }

        // Batch check all DL conflicts in ONE query across the entire draft date range
        const dlConflictMap = new Map();
        if (allAssignedOfficerIds.size > 0 && overallStartDate && overallEndDate) {
            const [dlConflicts] = await connection.query(`
                SELECT khp.profil_pegawai_id, pp.nama_lengkap, DATE_FORMAT(khp.tanggal, '%Y-%m-%d') as tanggal, khp.nama_kegiatan
                FROM kegiatan_harian_pegawai khp
                JOIN profil_pegawai pp ON khp.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_kegiatan mtk ON khp.tipe_kegiatan = mtk.kode
                WHERE khp.profil_pegawai_id IN (?)
                AND khp.tanggal BETWEEN ? AND ?
                AND (khp.tipe_kegiatan IN ('DL', 'DLB') OR mtk.nama IN ('Dinas Luar', 'DL Luar Bidang'))
            `, [Array.from(allAssignedOfficerIds), overallStartDate, overallEndDate]);

            dlConflicts.forEach(c => {
                dlConflictMap.set(`${c.profil_pegawai_id}_${c.tanggal}`, c);
            });
        }

        let instansiPenyelenggara = approverUser?.instansi_nama || 'Internal';
        if (approverUser && approverUser.instansi_id) {
            const [instRows] = await connection.query('SELECT instansi FROM master_instansi_daerah WHERE id = ?', [approverUser.instansi_id]);
            if (instRows.length > 0 && instRows[0].instansi) {
                instansiPenyelenggara = instRows[0].instansi;
            }
        }

        const integratedResults = [];
        const allNotifications = [];

        for (const team of teams) {
            const assignedIds = team.petugas_ids.split(',').map(Number).filter(Boolean);
            const kIds = team.kecamatan_id ? String(team.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean) : [];
            const resolvedKec = kIds.map(kid => batchKecMap[kid]).filter(Boolean).join(', ');
            if (resolvedKec) team.kecamatan_nama = resolvedKec;

            // DL check using in-memory pre-fetched conflicts
            const tStart = new Date(team.tanggal_mulai);
            const tEnd = new Date(team.tanggal_akhir || team.tanggal_mulai);
            for (const pid of assignedIds) {
                for (let d = new Date(tStart); d <= tEnd; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    const conf = dlConflictMap.get(`${pid}_${dateStr}`);
                    if (conf) {
                        throw new Error(`Pada tim "${team.nama_tim}", petugas "${conf.nama_lengkap}" sudah memiliki tugas Dinas Luar (${conf.nama_kegiatan}) pada tanggal ${conf.tanggal}.`);
                    }
                }
            }

            const officialNama = isMultipleTeams ? `${team.nama_kegiatan} - ${team.nama_tim}` : team.nama_kegiatan;

            let calculatedBidangIds = Array.from(new Set(assignedIds.map(id => officerBidangMap.get(id)).filter(Boolean))).join(',');
            if (!calculatedBidangIds && approverUser && approverUser.bidang_id) {
                calculatedBidangIds = String(approverUser.bidang_id);
            }

            let lokasiPrefix = '';
            if (team.kecamatan_nama) {
                lokasiPrefix = `[Kec. ${team.kecamatan_nama}${team.lokasi_detail ? ' - ' + team.lokasi_detail : ''}]`;
            } else if (team.lokasi_detail) {
                lokasiPrefix = `[Lokasi: ${team.lokasi_detail}]`;
            }
            const combinedKeterangan = [lokasiPrefix, team.keterangan].filter(Boolean).join(' ');

            const [kegiatanResult] = await connection.query(`
                INSERT INTO kegiatan_manajemen (
                    tanggal, tanggal_akhir, nama_kegiatan, jenis_kegiatan_id,
                    bidang_ids, instansi_penyelenggara, petugas_ids, kelengkapan,
                    keterangan, sesi, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Full Day', ?)
            `, [
                team.tanggal_mulai,
                team.tanggal_akhir || team.tanggal_mulai,
                officialNama,
                team.jenis_kegiatan_id,
                calculatedBidangIds,
                instansiPenyelenggara,
                assignedIds.join(','),
                combinedKeterangan,
                approverUser ? approverUser.id : null
            ]);

            const newKegiatanId = kegiatanResult.insertId;

            await connection.query(`
                INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan)
                VALUES (?, ?, 'create', ?)
            `, [
                newKegiatanId,
                approverUser ? approverUser.id : null,
                `Kegiatan resmi dibuat via Integrasi Draft Jadwal (Draft #${id}, Tim: ${team.nama_tim})`
            ]);

            await syncToKegiatanPegawai(connection, newKegiatanId);

            await connection.query(`
                UPDATE draft_jadwal_tim SET status = 'terintegrasi', kegiatan_manajemen_id = ?
                WHERE id = ?
            `, [newKegiatanId, team.id]);

            // Queue notifications to all assigned officers
            for (const pid of assignedIds) {
                const recipientUserId = officerUserMap.get(pid);
                if (recipientUserId) {
                    const notifTitle = `Penugasan Lapangan: ${officialNama}`;
                    const notifMsg = `Jadwal penugasan Anda untuk kegiatan "${officialNama}" (${team.nama_tim}) di ${team.kecamatan_nama || 'Lokasi Kegiatan'} pada tanggal ${team.tanggal_mulai} telah disetujui dan diterbitkan ke logbook.`;
                    allNotifications.push([recipientUserId, notifTitle, notifMsg, 'jadwal_tim', `kegiatan:${newKegiatanId}`]);
                }
            }

            integratedResults.push({ team_id: team.id, nama_tim: team.nama_tim, kegiatan_id: newKegiatanId });
        }

        // Bulk insert notifications in a single query
        if (allNotifications.length > 0) {
            try {
                await connection.query(
                    'INSERT INTO notifications (user_id, title, message, type, link) VALUES ?',
                    [allNotifications]
                );
            } catch (notifErr) {
                console.error('[Batch Notification send error]:', notifErr);
            }
        }

        // Update parent draft
        await connection.query(`
            UPDATE draft_jadwal_kegiatan SET
                status = 'terintegrasi',
                kegiatan_manajemen_id = ?,
                updated_by = ?
            WHERE id = ?
        `, [integratedResults[0]?.kegiatan_id || null, approverUser ? approverUser.id : null, id]);

        return integratedResults;
    },

    // 13. Get List of Ketua Tim for selection in submit modal
    getKatimList: async (req, res) => {
        try {
            const userSubBidangId = req.user?.sub_bidang_id || 0;
            const userBidangId = req.user?.bidang_id || 0;

            const [rows] = await pool.query(`
                SELECT 
                    u.id as id,
                    u.id as user_id, 
                    u.username, 
                    pp.id as profil_id,
                    pp.nama_lengkap, 
                    pp.nip,
                    mj.jabatan as nama_jabatan, 
                    pp.bidang_id, 
                    mb.nama_bidang, 
                    mb.singkatan as bidang_singkatan,
                    pp.sub_bidang_id,
                    msb.nama_sub_bidang,
                    msb.singkatan as sub_bidang_singkatan
                FROM users u
                JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
                LEFT JOIN master_bidang_instansi mb ON pp.bidang_id = mb.id
                LEFT JOIN master_sub_bidang_instansi msb ON pp.sub_bidang_id = msb.id
                LEFT JOIN master_tipe_user mtu ON pp.tipe_user_id = mtu.id
                WHERE mj.jabatan LIKE '%Ketua Tim%' 
                   OR mj.jabatan LIKE '%Katim%' 
                   OR mtu.tipe_user LIKE '%Ketua Tim%'
                ORDER BY 
                    CASE 
                        WHEN pp.sub_bidang_id = ? AND pp.sub_bidang_id IS NOT NULL THEN 1
                        WHEN pp.bidang_id = ? AND pp.bidang_id IS NOT NULL THEN 2
                        ELSE 3
                    END ASC,
                    pp.nama_lengkap ASC
            `, [userSubBidangId, userBidangId]);

            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('[getKatimList Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar Ketua Tim: ' + err.message });
        }
    },

    // 14. Submit Draft to Katim for Approval
    submitApproval: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;
            let { ketua_tim_id } = req.body;

            // Fetch draft
            const [drafts] = await connection.query(`
                SELECT d.*, pp.nama_lengkap as pembuat_nama, pp.bidang_id as pembuat_bidang_id, pp.sub_bidang_id as pembuat_sub_bidang_id
                FROM draft_jadwal_kegiatan d
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                WHERE d.id = ?
            `, [id]);

            if (drafts.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan' });
            }
            const draft = drafts[0];

            // Check if teams exist and have complete date, kecamatan, and officers
            const [teams] = await connection.query(`
                SELECT * FROM draft_jadwal_tim WHERE draft_id = ? ORDER BY id ASC
            `, [id]);

            if (teams.length === 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Draft ini belum memiliki tim atau sesi kegiatan' });
            }

            const unready = teams.filter(t => !t.tanggal_mulai || !t.kecamatan_id || !t.petugas_ids);
            if (unready.length > 0) {
                await connection.rollback();
                const names = unready.map(t => `"${t.nama_tim}"`).join(', ');
                return res.status(400).json({
                    success: false,
                    message: `Tim ${names} belum lengkap (tanggal, lokasi/kecamatan, atau petugas belum diatur). Lengkapi terlebih dahulu.`
                });
            }

            // If ketua_tim_id not provided, resolve automatically
            if (!ketua_tim_id) {
                const subBidangId = draft.pembuat_sub_bidang_id || req.user?.sub_bidang_id;
                const bidangId = draft.pembuat_bidang_id || req.user?.bidang_id;
                
                // Try matching sub_bidang first
                if (subBidangId) {
                    const [katimRows] = await connection.query(`
                        SELECT u.id 
                        FROM users u
                        JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                        LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
                        WHERE pp.sub_bidang_id = ? AND (mj.jabatan LIKE '%Ketua Tim%' OR mj.jabatan LIKE '%Katim%')
                        LIMIT 1
                    `, [subBidangId]);

                    if (katimRows.length > 0) {
                        ketua_tim_id = katimRows[0].id;
                    }
                }

                if (!ketua_tim_id && bidangId) {
                    // Try matching bidang
                    const [katimRows] = await connection.query(`
                        SELECT u.id 
                        FROM users u
                        JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                        LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
                        WHERE pp.bidang_id = ? AND (mj.jabatan LIKE '%Ketua Tim%' OR mj.jabatan LIKE '%Katim%')
                        LIMIT 1
                    `, [bidangId]);

                    if (katimRows.length > 0) {
                        ketua_tim_id = katimRows[0].id;
                    }
                }
            }

            if (!ketua_tim_id) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Ketua Tim tujuan belum dipilih atau tidak ditemukan.' });
            }

            // Update status of draft
            await connection.query(`
                UPDATE draft_jadwal_kegiatan 
                SET status = 'menunggu_persetujuan',
                    ketua_tim_id = ?,
                    catatan_katim = NULL,
                    updated_by = ?
                WHERE id = ?
            `, [ketua_tim_id, req.user?.id || null, id]);

            // Update status of unintegrated teams
            await connection.query(`
                UPDATE draft_jadwal_tim
                SET status = 'menunggu_persetujuan'
                WHERE draft_id = ? AND status != 'terintegrasi'
            `, [id]);

            await recordDraftHistory(
                connection,
                id,
                req.user?.id || null,
                'pengajuan',
                `Mengajukan draft jadwal ke Ketua Tim untuk verifikasi dan persetujuan (${teams.length} tim)`
            );

            await connection.commit();

            // Send notification to Ketua Tim
            const creatorName = draft.pembuat_nama || req.user?.nama || 'Staf';
            const notifTitle = `Persetujuan Jadwal: ${draft.nama_kegiatan}`;
            const notifMsg = `${creatorName} telah mengajukan draft jadwal "${draft.nama_kegiatan}" (${teams.length} tim/sesi) untuk diverifikasi dan disetujui.`;
            await notificationService.send(ketua_tim_id, notifTitle, notifMsg, 'approval_jadwal', `draft:${id}`);

            res.json({
                success: true,
                message: `Jadwal kegiatan berhasil diajukan ke Ketua Tim untuk diverifikasi.`
            });
        } catch (err) {
            await connection.rollback();
            console.error('[submitApproval Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengajukan draft ke Ketua Tim: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 15. Get Pending Jadwal Approvals for Kotak Masuk Terpadu
    getPendingApprovals: async (req, res) => {
        try {
            const userId = req.user?.id;
            const [userProfil] = await pool.query(`
                SELECT pp.bidang_id, pp.sub_bidang_id, mj.jabatan, mtu.tipe_user
                FROM users u
                JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
                LEFT JOIN master_tipe_user mtu ON pp.tipe_user_id = mtu.id
                WHERE u.id = ?
            `, [userId]);

            const profil = userProfil[0] || {};
            const isAdmin = profil.tipe_user && (profil.tipe_user.includes('Admin') || profil.tipe_user.includes('Pimpinan'));

            let query = `
                SELECT 
                    d.*,
                    tk.nama as jenis_kegiatan_nama,
                    tk.kode as jenis_kegiatan_kode,
                    tk.warna as jenis_kegiatan_warna,
                    tk.warna_teks as jenis_kegiatan_warna_teks,
                    pp_creator.nama_lengkap as pembuat_nama,
                    pp_creator.nip as pembuat_nip,
                    mb.nama_bidang as bidang_nama,
                    pp_katim.nama_lengkap as ketua_tim_nama
                FROM draft_jadwal_kegiatan d
                LEFT JOIN master_tipe_kegiatan tk ON d.jenis_kegiatan_id = tk.id
                LEFT JOIN users u_creator ON d.created_by = u_creator.id
                LEFT JOIN profil_pegawai pp_creator ON u_creator.profil_pegawai_id = pp_creator.id
                LEFT JOIN master_bidang_instansi mb ON pp_creator.bidang_id = mb.id
                LEFT JOIN users u_katim ON d.ketua_tim_id = u_katim.id
                LEFT JOIN profil_pegawai pp_katim ON u_katim.profil_pegawai_id = pp_katim.id
                WHERE d.status = 'menunggu_persetujuan' AND d.is_deleted = 0
            `;
            const params = [];

            if (!isAdmin) {
                query += ` AND (d.ketua_tim_id = ? OR (d.ketua_tim_id IS NULL AND pp_creator.bidang_id = ?))`;
                params.push(userId, profil.bidang_id || 0);
            }

            query += ` ORDER BY d.updated_at DESC, d.id DESC`;

            const [drafts] = await pool.query(query, params);

            if (drafts.length === 0) {
                return res.json({ success: true, data: [] });
            }

            const draftIds = drafts.map(d => d.id);

            // Fetch teams
            const [teams] = await pool.query(`
                SELECT 
                    t.*,
                    DATE_FORMAT(t.tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
                    DATE_FORMAT(t.tanggal_akhir, '%Y-%m-%d') as tanggal_akhir,
                    mk.nama as kecamatan_nama
                FROM draft_jadwal_tim t
                LEFT JOIN master_kecamatan mk ON t.kecamatan_id = mk.id
                WHERE t.draft_id IN (?) AND t.is_deleted = 0
                ORDER BY t.tanggal_mulai ASC, t.id ASC
            `, [draftIds]);

            // Batch resolve officers and kecamatan
            const allPetugasIds = new Set();
            const allKecIds = new Set();
            teams.forEach(t => {
                if (t.petugas_ids) {
                    t.petugas_ids.split(',').forEach(id => {
                        const n = Number(id.trim());
                        if (n > 0) allPetugasIds.add(n);
                    });
                }
                if (t.kecamatan_id) {
                    String(t.kecamatan_id).split(',').forEach(id => {
                        const trimmed = id.trim();
                        if (trimmed) allKecIds.add(trimmed);
                    });
                }
            });

            let officersMap = {};
            if (allPetugasIds.size > 0) {
                const [officers] = await pool.query(`
                    SELECT id, nama_lengkap, nip, foto_profil
                    FROM profil_pegawai WHERE id IN (?)
                `, [Array.from(allPetugasIds)]);
                officers.forEach(o => { officersMap[o.id] = o; });
            }

            let kecMap = {};
            if (allKecIds.size > 0) {
                const [kecRows] = await pool.query(`
                    SELECT id, nama FROM master_kecamatan WHERE id IN (?)
                `, [Array.from(allKecIds)]);
                kecRows.forEach(k => { kecMap[String(k.id)] = k.nama; });
            }

            const teamsByDraft = {};
            teams.forEach(t => {
                const pIds = t.petugas_ids ? t.petugas_ids.split(',').map(Number).filter(Boolean) : [];
                const kIds = t.kecamatan_id ? String(t.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean) : [];
                const resolvedKecNama = kIds.map(id => kecMap[id]).filter(Boolean).join(', ');

                const teamObj = {
                    ...t,
                    kecamatan_nama: resolvedKecNama || t.kecamatan_nama || null,
                    officers: pIds.map(id => officersMap[id]).filter(Boolean),
                    total_petugas: pIds.length
                };

                if (!teamsByDraft[t.draft_id]) teamsByDraft[t.draft_id] = [];
                teamsByDraft[t.draft_id].push(teamObj);
            });

            const formatted = drafts.map(d => {
                const draftTeams = teamsByDraft[d.id] || [];
                const totalSchedules = draftTeams.length;
                const uniqueTeamNames = new Set(draftTeams.map(t => (t.nama_tim || '').trim()).filter(Boolean));
                const uniqueDates = new Set(draftTeams.map(t => t.tanggal_mulai).filter(Boolean));
                const totalUniqueTeams = uniqueTeamNames.size || totalSchedules;
                const totalDays = uniqueDates.size || (totalSchedules > 0 ? 1 : 0);

                return {
                    ...d,
                    teams: draftTeams,
                    total_teams: totalUniqueTeams,
                    total_unique_teams: totalUniqueTeams,
                    total_days: totalDays,
                    total_team_schedules: totalSchedules
                };
            });

            res.json({ success: true, data: formatted });
        } catch (err) {
            console.error('[getPendingApprovals Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar pengajuan jadwal: ' + err.message });
        }
    },

    // 16. Approve Draft Jadwal (Setujui & Terbitkan ke Logbook)
    approve: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;
            const { catatan } = req.body;

            // Fetch draft
            const [drafts] = await connection.query(`
                SELECT d.*, pp.nama_lengkap as pembuat_nama, u.id as creator_user_id
                FROM draft_jadwal_kegiatan d
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                WHERE d.id = ?
            `, [id]);

            if (drafts.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan' });
            }
            const draft = drafts[0];

            // Execute integration
            const integrateResult = await draftJadwalController.executeDraftIntegration(connection, id, req.user, catatan);

            // Update draft with approved metadata
            await connection.query(`
                UPDATE draft_jadwal_kegiatan
                SET approved_by = ?,
                    approved_at = NOW(),
                    catatan_katim = ?
                WHERE id = ?
            `, [req.user?.id || null, catatan || null, id]);

            await recordDraftHistory(
                connection,
                id,
                req.user?.id || null,
                'disetujui',
                `Jadwal disetujui oleh Ketua Tim dan resmi diterbitkan ke Logbook Seluruh Petugas${catatan ? `. Catatan: "${catatan}"` : ''}`
            );

            await connection.commit();

            // Send notification to creator
            if (draft.creator_user_id) {
                const katimName = req.user?.nama || req.user?.nama_lengkap || 'Ketua Tim';
                const creatorNotifTitle = `Jadwal Disetujui: ${draft.nama_kegiatan}`;
                const creatorNotifMsg = `Draft jadwal kegiatan "${draft.nama_kegiatan}" telah disetujui oleh ${katimName} dan resmi diterbitkan ke logbook serta daftar kegiatan.`;
                await notificationService.send(draft.creator_user_id, creatorNotifTitle, creatorNotifMsg, 'jadwal_disetujui', `draft:${id}`);
            }

            // Mark any approval_jadwal notifications for this draft as read for this Katim
            await pool.query(`
                UPDATE notifications 
                SET is_read = 1 
                WHERE user_id = ? AND type = 'approval_jadwal' AND link = ?
            `, [req.user?.id, `draft:${id}`]);

            res.json({
                success: true,
                message: `Jadwal "${draft.nama_kegiatan}" berhasil disetujui dan resmi diterbitkan ke Logbook Seluruh Petugas!`,
                data: integrateResult
            });
        } catch (err) {
            await connection.rollback();
            console.error('[approve Draft Error]:', err);
            res.status(500).json({ success: false, message: err.message || 'Gagal menyetujui jadwal' });
        } finally {
            connection.release();
        }
    },

    // 17. Reject / Return Draft Jadwal (Kembalikan untuk Revisi)
    reject: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;
            const { reason } = req.body;

            if (!reason || !reason.trim()) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Alasan atau catatan pengembalian jadwal wajib diisi.' });
            }

            // Fetch draft
            const [drafts] = await connection.query(`
                SELECT d.*, u.id as creator_user_id
                FROM draft_jadwal_kegiatan d
                LEFT JOIN users u ON d.created_by = u.id
                WHERE d.id = ?
            `, [id]);

            if (drafts.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft jadwal tidak ditemukan' });
            }
            const draft = drafts[0];

            // Update draft status to 'dikembalikan'
            await connection.query(`
                UPDATE draft_jadwal_kegiatan
                SET status = 'dikembalikan',
                    catatan_katim = ?,
                    approved_by = ?,
                    approved_at = NOW(),
                    updated_by = ?
                WHERE id = ?
            `, [reason.trim(), req.user?.id || null, req.user?.id || null, id]);

            // Update teams status to 'dikembalikan'
            await connection.query(`
                UPDATE draft_jadwal_tim
                SET status = 'dikembalikan'
                WHERE draft_id = ? AND status != 'terintegrasi'
            `, [id]);

            await recordDraftHistory(
                connection,
                id,
                req.user?.id || null,
                'dikembalikan',
                `Jadwal dikembalikan oleh Ketua Tim untuk revisi. Catatan: "${reason.trim()}"`
            );

            await connection.commit();

            // Send notification to creator
            if (draft.creator_user_id) {
                const katimName = req.user?.nama || req.user?.nama_lengkap || 'Ketua Tim';
                const notifTitle = `Jadwal Dikembalikan: ${draft.nama_kegiatan}`;
                const notifMsg = `Draft jadwal kegiatan "${draft.nama_kegiatan}" dikembalikan oleh ${katimName} dengan catatan: "${reason.trim()}". Silakan lakukan perbaikan.`;
                await notificationService.send(draft.creator_user_id, notifTitle, notifMsg, 'revisi_jadwal', `draft:${id}`);
            }

            // Mark any approval_jadwal notifications for this draft as read for this Katim
            await pool.query(`
                UPDATE notifications 
                SET is_read = 1 
                WHERE user_id = ? AND type = 'approval_jadwal' AND link = ?
            `, [req.user?.id, `draft:${id}`]);

            res.json({
                success: true,
                message: `Jadwal "${draft.nama_kegiatan}" berhasil dikembalikan ke pembuat jadwal untuk direvisi.`
            });
        } catch (err) {
            await connection.rollback();
            console.error('[reject Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengembalikan draft: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 18. Legacy Direct Integrate Entire Draft
    integrate: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;

            const integratedResults = await draftJadwalController.executeDraftIntegration(connection, id, req.user);
            await connection.commit();

            res.json({
                success: true,
                message: `Berhasil mengintegrasikan ${integratedResults.length} tim ke Daftar Kegiatan dan Logbook Pegawai!`,
                data: integratedResults
            });
        } catch (err) {
            await connection.rollback();
            console.error('[integrate Draft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengintegrasikan draft jadwal: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 13. Import Drafts from Excel
    importExcel: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { drafts, rows } = req.body;

            // Determine user's kota_kabupaten_id
            let kotaId = '3201';
            if (req.user && req.user.instansi_id) {
                const [inst] = await connection.query(
                    'SELECT kota_kabupaten_id FROM master_instansi_daerah WHERE id = ?',
                    [req.user.instansi_id]
                );
                if (inst.length > 0 && inst[0].kota_kabupaten_id) {
                    kotaId = String(inst[0].kota_kabupaten_id);
                }
            }

            // Group if rows provided
            let draftList = [];
            if (Array.isArray(drafts) && drafts.length > 0) {
                draftList = drafts;
            } else if (Array.isArray(rows) && rows.length > 0) {
                const groupMap = new Map();
                for (const r of rows) {
                    const kegName = (r.nama_kegiatan || '').trim() || 'Kegiatan Tanpa Nama';
                    if (!groupMap.has(kegName)) {
                        groupMap.set(kegName, {
                            nama_kegiatan: kegName,
                            jenis_kegiatan_id: r.jenis_kegiatan_id || 1,
                            teams: []
                        });
                    }
                    const draftObj = groupMap.get(kegName);
                    if (r.jenis_kegiatan_id) draftObj.jenis_kegiatan_id = r.jenis_kegiatan_id;
                    draftObj.teams.push({
                        nama_tim: (r.nama_tim || '').trim() || `Tim ${draftObj.teams.length + 1}`,
                        tanggal_mulai: r.tanggal_mulai || null,
                        tanggal_akhir: r.tanggal_akhir || r.tanggal_mulai || null,
                        kecamatan_id: r.kecamatan_id || null,
                        lokasi_detail: r.lokasi_detail ? r.lokasi_detail.trim() : null,
                        petugas_ids: r.petugas_ids || null,
                        keterangan: r.keterangan ? r.keterangan.trim() : null
                    });
                }
                draftList = Array.from(groupMap.values());
            }

            if (draftList.length === 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Tidak ada data kegiatan yang valid untuk diimpor' });
            }

            let totalCreatedDrafts = 0;
            let totalCreatedTeams = 0;

            for (const d of draftList) {
                const namaKegiatan = (d.nama_kegiatan || '').trim();
                if (!namaKegiatan) continue;

                const [draftResult] = await connection.query(`
                    INSERT INTO draft_jadwal_kegiatan (
                        nama_kegiatan,
                        jenis_kegiatan_id,
                        kota_kabupaten_id,
                        status,
                        created_by
                    ) VALUES (?, ?, ?, 'draft', ?)
                `, [
                    namaKegiatan,
                    d.jenis_kegiatan_id || 1,
                    kotaId,
                    req.user ? req.user.id : null
                ]);

                const newDraftId = draftResult.insertId;
                totalCreatedDrafts++;

                const teams = Array.isArray(d.teams) && d.teams.length > 0 
                    ? d.teams 
                    : [{ nama_tim: 'Tim 1' }];

                for (const t of teams) {
                    const teamName = (t.nama_tim || '').trim() || 'Tim 1';
                    const pIds = Array.isArray(t.petugas_ids) 
                        ? t.petugas_ids.map(Number).filter(Boolean).join(',') 
                        : (t.petugas_ids ? String(t.petugas_ids).trim() : null);

                    const kIds = Array.isArray(t.kecamatan_id)
                        ? t.kecamatan_id.map(s => String(s).trim()).filter(Boolean).join(',')
                        : (t.kecamatan_id ? String(t.kecamatan_id).trim() : null);

                    await connection.query(`
                        INSERT INTO draft_jadwal_tim (
                            draft_id,
                            nama_tim,
                            tanggal_mulai,
                            tanggal_akhir,
                            kota_kabupaten_id,
                            kecamatan_id,
                            lokasi_detail,
                            petugas_ids,
                            keterangan,
                            status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
                    `, [
                        newDraftId,
                        teamName,
                        t.tanggal_mulai || null,
                        t.tanggal_akhir || t.tanggal_mulai || null,
                        kotaId,
                        kIds || null,
                        t.lokasi_detail ? t.lokasi_detail.trim() : null,
                        pIds || null,
                        t.keterangan ? t.keterangan.trim() : null
                    ]);
                    totalCreatedTeams++;
                }

                await recordDraftHistory(
                    connection,
                    newDraftId,
                    req.user ? req.user.id : null,
                    'import',
                    `Draft diimpor dari file Excel (${teams.length} tim)`
                );
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: `Berhasil mengimpor ${totalCreatedDrafts} kegiatan dan ${totalCreatedTeams} jadwal tim dari Excel!`,
                data: {
                    total_drafts: totalCreatedDrafts,
                    total_teams: totalCreatedTeams
                }
            });
        } catch (err) {
            await connection.rollback();
            console.error('[importExcel Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengimpor draft jadwal: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 13. Duplicate Draft Kegiatan ("copy [nama kegiatan]")
    duplicateDraft: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;

            // 1. Fetch source draft
            const [sourceDrafts] = await connection.query(
                'SELECT * FROM draft_jadwal_kegiatan WHERE id = ? AND is_deleted = 0',
                [id]
            );
            if (sourceDrafts.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Draft kegiatan asal tidak ditemukan' });
            }
            const src = sourceDrafts[0];

            // 2. Determine new draft name: "copy " + nama_kegiatan
            const newName = `copy ${src.nama_kegiatan}`;

            // 3. Insert new duplicated draft
            const [newDraftResult] = await connection.query(`
                INSERT INTO draft_jadwal_kegiatan (
                    nama_kegiatan,
                    jenis_kegiatan_id,
                    kota_kabupaten_id,
                    bidang_ids,
                    status,
                    visibility,
                    ketua_tim_id,
                    created_by
                ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)
            `, [
                newName,
                src.jenis_kegiatan_id,
                src.kota_kabupaten_id,
                src.bidang_ids,
                src.visibility || 'bidang',
                src.ketua_tim_id || null,
                req.user ? req.user.id : src.created_by
            ]);

            const newDraftId = newDraftResult.insertId;

            // 4. Fetch all non-deleted teams of the source draft
            const [srcTeams] = await connection.query(
                'SELECT * FROM draft_jadwal_tim WHERE draft_id = ? AND is_deleted = 0 ORDER BY id ASC',
                [id]
            );

            // 5. Insert duplicate teams
            if (srcTeams.length > 0) {
                for (const team of srcTeams) {
                    await connection.query(`
                        INSERT INTO draft_jadwal_tim (
                            draft_id,
                            nama_tim,
                            tanggal_mulai,
                            tanggal_akhir,
                            kota_kabupaten_id,
                            kecamatan_id,
                            lokasi_detail,
                            petugas_ids,
                            keterangan,
                            status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
                    `, [
                        newDraftId,
                        team.nama_tim,
                        team.tanggal_mulai,
                        team.tanggal_akhir,
                        team.kota_kabupaten_id,
                        team.kecamatan_id,
                        team.lokasi_detail,
                        team.petugas_ids,
                        team.keterangan
                    ]);
                }
            } else {
                // Fallback default team
                await connection.query(`
                    INSERT INTO draft_jadwal_tim (draft_id, nama_tim, kota_kabupaten_id, status)
                    VALUES (?, 'Tim 1', ?, 'draft')
                `, [newDraftId, src.kota_kabupaten_id || null]);
            }

            // 6. Record history
            await recordDraftHistory(
                connection,
                newDraftId,
                req.user ? req.user.id : null,
                'duplicate',
                `Menduplikasi kegiatan dari "${src.nama_kegiatan}" (ID #${src.id})`
            );

            await connection.commit();

            res.json({
                success: true,
                message: `Draft kegiatan berhasil disalin sebagai "${newName}"`,
                data: {
                    id: newDraftId,
                    nama_kegiatan: newName
                }
            });
        } catch (err) {
            await connection.rollback();
            console.error('[duplicateDraft Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal menduplikasi draft: ' + err.message });
        } finally {
            connection.release();
        }
    },

    // 14. Update Visibility ('personal' | 'bidang')
    updateVisibility: async (req, res) => {
        try {
            const { id } = req.params;
            const { visibility } = req.body;

            if (!visibility || !['personal', 'bidang'].includes(visibility)) {
                return res.status(400).json({ success: false, message: "Visibilitas hanya boleh 'personal' atau 'bidang'" });
            }

            const [drafts] = await pool.query('SELECT id, created_by, status FROM draft_jadwal_kegiatan WHERE id = ?', [id]);
            if (drafts.length === 0) {
                return res.status(404).json({ success: false, message: 'Draft kegiatan tidak ditemukan' });
            }

            const draft = drafts[0];
            const userId = req.user ? req.user.id : null;
            const userTipe = req.user ? Number(req.user.tipe_user || req.user.tipe_user_id || 0) : 0;

            // Switcher bidang dan personal, hanya bisa diganti ke personal oleh user pembuatnya
            if (visibility === 'personal' && draft.created_by && Number(draft.created_by) !== Number(userId)) {
                return res.status(403).json({ success: false, message: 'Hanya pembuat draft yang dapat mengubah visibilitas menjadi personal' });
            }

            // Only creator or superadmin can change visibility
            if (userTipe !== 1 && draft.created_by && Number(draft.created_by) !== Number(userId)) {
                return res.status(403).json({ success: false, message: 'Hanya pembuat draft yang dapat mengubah visibilitas' });
            }

            await pool.query('UPDATE draft_jadwal_kegiatan SET visibility = ? WHERE id = ?', [visibility, id]);

            await recordDraftHistory(
                pool,
                id,
                userId,
                'update_visibility',
                `Mengubah visibilitas draft menjadi ${visibility === 'personal' ? 'Personal' : 'Bidang'}`
            );

            res.json({
                success: true,
                message: `Visibilitas draft berhasil diubah menjadi ${visibility === 'personal' ? 'Personal' : 'Bidang'}`,
                visibility
            });
        } catch (err) {
            console.error('[updateVisibility Error]:', err);
            res.status(500).json({ success: false, message: 'Gagal mengubah visibilitas: ' + err.message });
        }
    }
};

module.exports = draftJadwalController;
