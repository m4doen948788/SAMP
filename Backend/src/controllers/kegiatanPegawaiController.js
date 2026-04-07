const pool = require('../config/db');

// Get activities for all employees in a bidang for a specific month/year
const getMonthlyActivities = async (req, res) => {
    try {
        const { instansi_id, bidang_id, month, year } = req.query;

        // Base query for employees in the bidang/instansi
        let query = `
            SELECT 
                p.id as profil_id,
                p.nama_lengkap,
                j.jabatan,
                b.singkatan as bidang_singkatan
            FROM profil_pegawai p
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            WHERE p.instansi_id = ? AND p.is_active = 1
        `;
        const params = [instansi_id];

        if (bidang_id && bidang_id !== 'all') {
            query += ' AND p.bidang_id = ?';
            params.push(bidang_id);
        }

        query += `
            ORDER BY 
                CASE 
                    WHEN j.jabatan IN ('Kepala', 'Direktur', 'Bupati', 'Sekretaris Daerah') OR j.jabatan LIKE 'Kepala Badan%' OR j.jabatan LIKE 'Kepala Dinas%' THEN 1
                    WHEN j.jabatan LIKE '%Sekretaris%' OR j.jabatan LIKE '%Wakil Direktur%' THEN 2
                    WHEN j.jabatan LIKE '%Kepala Bidang%' OR j.jabatan LIKE '%Kepala Bagian%' THEN 3
                    WHEN j.jabatan LIKE '%Ketua Tim%' OR j.jabatan LIKE '%Kepala Sub Bagian%' OR j.jabatan LIKE '%Kasubbag%' OR j.jabatan LIKE '%Kepala Seksi%' THEN 4
                    ELSE 5
                END,
                p.nama_lengkap ASC
        `;

        const [pegawai] = await pool.query(query, params);

        // Get activities for this month
        const [activities] = await pool.query(`
            SELECT 
                a.id, a.profil_pegawai_id, a.tanggal, DAY(a.tanggal) as day_num, a.sesi, 
                COALESCE(t.kode, a.tipe_kegiatan) as tipe_kegiatan, 
                a.id_kegiatan_eksternal, a.nama_kegiatan, a.lampiran_kegiatan, a.keterangan
            FROM kegiatan_harian_pegawai a
            LEFT JOIN kegiatan_manajemen k ON a.id_kegiatan_eksternal = k.id
            LEFT JOIN master_tipe_kegiatan t ON k.jenis_kegiatan_id = t.id
            WHERE MONTH(a.tanggal) = ? AND YEAR(a.tanggal) = ?
            AND a.profil_pegawai_id IN (SELECT id FROM profil_pegawai WHERE instansi_id = ?)
        `, [month, year, instansi_id]);

        // Map activities to employee id
        const activityMap = {};
        activities.forEach(a => {
            const day = a.day_num;
            if (!activityMap[a.profil_pegawai_id]) activityMap[a.profil_pegawai_id] = {};
            if (!activityMap[a.profil_pegawai_id][day]) activityMap[a.profil_pegawai_id][day] = {};
            if (!activityMap[a.profil_pegawai_id][day][a.sesi]) activityMap[a.profil_pegawai_id][day][a.sesi] = [];

            activityMap[a.profil_pegawai_id][day][a.sesi].push({
                id: a.id,
                tipe: a.tipe_kegiatan || 'RM',
                id_eksternal: a.id_kegiatan_eksternal,
                nama: a.nama_kegiatan,
                lampiran: a.lampiran_kegiatan,
                keterangan: a.keterangan
            });
        });

        const result = pegawai.map(p => ({
            ...p,
            activities: activityMap[p.profil_id] || {}
        }));

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Upsert a daily activity record
const upsertActivity = async (req, res) => {
    try {
        const { id, profil_pegawai_id, tanggal, sesi, tipe_kegiatan, id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan } = req.body;
        const userId = req.user.id;
        const userTipe = req.user.tipe_user_id;

        const allowedRoles = [1, 4, 6];
        if (!allowedRoles.includes(userTipe)) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin untuk mengedit kegiatan.' });
        }

        // Handle deletion
        if (!tipe_kegiatan) {
            if (id) {
                await pool.query(
                    'DELETE FROM kegiatan_harian_pegawai WHERE id = ?',
                    [id]
                );
            } else if (id_kegiatan_eksternal) {
                await pool.query(
                    'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ? AND sesi = ? AND id_kegiatan_eksternal = ?',
                    [profil_pegawai_id, tanggal, sesi || 'Pagi', id_kegiatan_eksternal]
                );
            } else {
                if (sesi === 'Both') {
                    await pool.query(
                        'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ?',
                        [profil_pegawai_id, tanggal]
                    );
                } else {
                    await pool.query(
                        'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ? AND sesi = ?',
                        [profil_pegawai_id, tanggal, sesi || 'Pagi']
                    );
                }
            }
            return res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
        }

        await pool.query(`
            INSERT INTO kegiatan_harian_pegawai (id, profil_pegawai_id, tanggal, sesi, tipe_kegiatan, id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE tipe_kegiatan = ?, nama_kegiatan = ?, lampiran_kegiatan = ?, keterangan = ?, updated_by = ?
        `, [
            id || null, profil_pegawai_id, tanggal, sesi || 'Pagi', tipe_kegiatan, id_kegiatan_eksternal || null, nama_kegiatan || '', lampiran_kegiatan || '', keterangan || '', userId, userId,
            tipe_kegiatan, nama_kegiatan || '', lampiran_kegiatan || '', keterangan || '', userId
        ]);

        res.json({ success: true, message: 'Kegiatan berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get yearly summary for all employees in a bidang
const getYearlySummary = async (req, res) => {
    try {
        const { instansi_id, bidang_id, year } = req.query;

        let query = `
            SELECT 
                p.id as profil_id,
                p.nama_lengkap,
                b.singkatan as bidang_singkatan
            FROM profil_pegawai p
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            WHERE p.instansi_id = ? AND p.is_active = 1
        `;
        const params = [instansi_id];

        if (bidang_id && bidang_id !== 'all') {
            query += ' AND p.bidang_id = ?';
            params.push(bidang_id);
        }

        query += `
            ORDER BY 
                CASE 
                    WHEN j.jabatan IN ('Kepala', 'Direktur', 'Bupati', 'Sekretaris Daerah') OR j.jabatan LIKE 'Kepala Badan%' OR j.jabatan LIKE 'Kepala Dinas%' THEN 1
                    WHEN j.jabatan LIKE '%Sekretaris%' OR j.jabatan LIKE '%Wakil Direktur%' THEN 2
                    WHEN j.jabatan LIKE '%Kepala Bidang%' OR j.jabatan LIKE '%Kepala Bagian%' THEN 3
                    WHEN j.jabatan LIKE '%Ketua Tim%' OR j.jabatan LIKE '%Kepala Sub Bagian%' OR j.jabatan LIKE '%Kasubbag%' OR j.jabatan LIKE '%Kepala Seksi%' THEN 4
                    ELSE 5
                END,
                p.nama_lengkap ASC
        `;

        const [pegawai] = await pool.query(query, params);

        // Get all base activity types to initialize summary objects
        const [activityTypes] = await pool.query('SELECT kode, parent_id FROM master_tipe_kegiatan');
        const baseTypes = activityTypes.filter(t => !t.parent_id).map(t => t.kode);
        
        const [summary] = await pool.query(`
            SELECT 
                a.profil_pegawai_id,
                COALESCE(t.kode, a.tipe_kegiatan) as raw_tipe,
                CASE 
                    WHEN t_parent.kode IS NOT NULL THEN t_parent.kode
                    ELSE COALESCE(t.kode, a.tipe_kegiatan)
                END as tipe_kegiatan,
                CASE 
                    WHEN (t_parent.is_rapat = 1 OR t.is_rapat = 1)
                    THEN COUNT(DISTINCT a.tanggal, a.id_kegiatan_eksternal)
                    ELSE COUNT(*) 
                END as total
            FROM kegiatan_harian_pegawai a
            LEFT JOIN kegiatan_manajemen k ON a.id_kegiatan_eksternal = k.id
            LEFT JOIN master_tipe_kegiatan t ON k.jenis_kegiatan_id = t.id
            LEFT JOIN master_tipe_kegiatan t_parent ON t.parent_id = t_parent.id
            WHERE YEAR(a.tanggal) = ?
            AND a.profil_pegawai_id IN (SELECT id FROM profil_pegawai WHERE instansi_id = ?)
            GROUP BY a.profil_pegawai_id, 
                     CASE 
                        WHEN t_parent.kode IS NOT NULL THEN t_parent.kode
                        ELSE COALESCE(t.kode, a.tipe_kegiatan)
                     END
        `, [year, instansi_id]);

        const summaryMap = {};
        
        // Initialize for all pegawai with all known base types
        pegawai.forEach(p => {
            const initialSummary = { total: 0 };
            baseTypes.forEach(kode => { initialSummary[kode] = 0; });
            summaryMap[p.profil_id] = initialSummary;
        });

        summary.forEach(s => {
            if (summaryMap[s.profil_pegawai_id]) {
                const key = s.tipe_kegiatan;
                const val = Number(s.total);
                
                if (summaryMap[s.profil_pegawai_id][key] === undefined) {
                    summaryMap[s.profil_pegawai_id][key] = val;
                } else {
                    summaryMap[s.profil_pegawai_id][key] += val;
                }
                summaryMap[s.profil_pegawai_id].total += val;
            }
        });

        const result = pegawai.map(p => ({
            ...p,
            summary: summaryMap[p.profil_id]
        }));

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getMonthlyActivities, upsertActivity, getYearlySummary };
