const pool = require('../../../config/db');
const auditService = require('../../../utils/auditService');

const isBapperidaUser = (user) => {
    if (!user) return false;
    return true; // Allow authenticated planning module users
};

const rpjmdRenstraController = {
    // 1. Get Periode RPJMD
    getPeriode: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM rpjmd_periode ORDER BY tahun_awal DESC');
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error in getPeriode:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 2. Get RPJMD Data (Visi -> Misi -> Tujuan -> Sasaran)
    getRPJMD: async (req, res) => {
        try {
            let { periode_id } = req.query;
            if (!periode_id || periode_id === 'undefined' || periode_id === 'null') {
                const [activePeriode] = await pool.query('SELECT id FROM rpjmd_periode ORDER BY is_active DESC, tahun_awal DESC LIMIT 1');
                if (activePeriode.length > 0) periode_id = activePeriode[0].id;
            }

            const [visiList] = await pool.query('SELECT * FROM rpjmd_visi WHERE periode_id = ? ORDER BY id ASC', [periode_id]);
            
            for (let visi of visiList) {
                const [misiList] = await pool.query('SELECT * FROM rpjmd_misi WHERE visi_id = ? ORDER BY kode_misi ASC', [visi.id]);
                visi.misi_list = misiList;

                for (let misi of misiList) {
                    const [tujuanList] = await pool.query('SELECT * FROM rpjmd_tujuan WHERE misi_id = ? ORDER BY kode_tujuan ASC', [misi.id]);
                    misi.tujuan_list = tujuanList;

                    for (let tujuan of tujuanList) {
                        const [sasaranList] = await pool.query(`
                            SELECT s.*, rps.kode_sasaran as rpjpd_kode_sasaran, rps.sasaran_pokok as rpjpd_sasaran_pokok
                            FROM rpjmd_sasaran s
                            LEFT JOIN rpjpd_sasaran rps ON s.rpjpd_sasaran_id = rps.id
                            WHERE s.tujuan_id = ? 
                            ORDER BY s.kode_sasaran ASC
                        `, [tujuan.id]);
                        tujuan.sasaran_list = sasaranList;
                    }
                }
            }

            res.json({ success: true, data: visiList });
        } catch (err) {
            console.error('Error in getRPJMD:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 3. Save / Update RPJMD Visi
    saveVisi: async (req, res) => {
        try {
            if (!isBapperidaUser(req.user)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }
            let { id, periode_id, visi } = req.body;
            if (!visi || !visi.trim()) {
                return res.status(400).json({ success: false, message: 'Visi wajib diisi' });
            }

            let validPeriodeId = Number(periode_id);
            if (!validPeriodeId || isNaN(validPeriodeId)) {
                const [activePeriode] = await pool.query('SELECT id FROM rpjmd_periode ORDER BY is_active DESC, tahun_awal DESC LIMIT 1');
                if (activePeriode.length > 0) {
                    validPeriodeId = activePeriode[0].id;
                } else {
                    validPeriodeId = 1;
                }
            }

            if (id) {
                await pool.query('UPDATE rpjmd_visi SET visi = ? WHERE id = ?', [visi, id]);
            } else {
                await pool.query('INSERT INTO rpjmd_visi (periode_id, visi) VALUES (?, ?)', [validPeriodeId, visi]);
            }
            res.json({ success: true, message: 'Visi RPJMD berhasil disimpan' });
        } catch (err) {
            console.error('Error in saveVisi:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 4. Save / Update RPJMD Misi
    saveMisi: async (req, res) => {
        try {
            if (!isBapperidaUser(req.user)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }
            const { id, visi_id, kode_misi, misi } = req.body;
            if (id) {
                await pool.query('UPDATE rpjmd_misi SET kode_misi = ?, misi = ? WHERE id = ?', [kode_misi, misi, id]);
            } else {
                await pool.query('INSERT INTO rpjmd_misi (visi_id, kode_misi, misi) VALUES (?, ?, ?)', [visi_id, kode_misi, misi]);
            }
            res.json({ success: true, message: 'Misi RPJMD berhasil disimpan' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 4b. Save / Update RPJMD Tujuan
    saveTujuan: async (req, res) => {
        try {
            if (!isBapperidaUser(req.user)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }
            const { id, misi_id, kode_tujuan, tujuan, indikator, satuan } = req.body;
            if (id) {
                await pool.query('UPDATE rpjmd_tujuan SET kode_tujuan = ?, tujuan = ?, indikator = ?, satuan = ? WHERE id = ?', [kode_tujuan, tujuan, indikator, satuan, id]);
            } else {
                await pool.query('INSERT INTO rpjmd_tujuan (misi_id, kode_tujuan, tujuan, indikator, satuan) VALUES (?, ?, ?, ?, ?)', [misi_id, kode_tujuan, tujuan, indikator, satuan]);
            }
            res.json({ success: true, message: 'Tujuan RPJMD berhasil disimpan' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 5. Save / Update RPJMD Sasaran
    saveSasaran: async (req, res) => {
        try {
            if (!isBapperidaUser(req.user)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }
            const {
                id, tujuan_id, rpjpd_sasaran_id, kode_sasaran, sasaran, indikator, satuan,
                baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir,
                pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5
            } = req.body;

            const rpjpdId = rpjpd_sasaran_id ? Number(rpjpd_sasaran_id) : null;
            const paguTotal = (Number(pagu_t1) || 0) + (Number(pagu_t2) || 0) + (Number(pagu_t3) || 0) + (Number(pagu_t4) || 0) + (Number(pagu_t5) || 0);

            if (id) {
                await pool.query(`
                    UPDATE rpjmd_sasaran SET 
                        rpjpd_sasaran_id = ?, kode_sasaran = ?, sasaran = ?, indikator = ?, satuan = ?, baseline_t0 = ?,
                        target_t1 = ?, target_t2 = ?, target_t3 = ?, target_t4 = ?, target_t5 = ?, target_akhir = ?,
                        pagu_t1 = ?, pagu_t2 = ?, pagu_t3 = ?, pagu_t4 = ?, pagu_t5 = ?, pagu_total = ?
                    WHERE id = ?
                `, [rpjpdId, kode_sasaran, sasaran, indikator, satuan, baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir, pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5, paguTotal, id]);
            } else {
                await pool.query(`
                    INSERT INTO rpjmd_sasaran 
                    (tujuan_id, rpjpd_sasaran_id, kode_sasaran, sasaran, indikator, satuan, baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir, pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5, pagu_total)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [tujuan_id, rpjpdId, kode_sasaran, sasaran, indikator, satuan, baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir, pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5, paguTotal]);
            }

            res.json({ success: true, message: 'Sasaran RPJMD berhasil disimpan' });
        } catch (err) {
            console.error('Error in saveSasaran:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Delete RPJMD Item (Visi, Misi, Tujuan, Sasaran)
    deleteRPJMDItem: async (req, res) => {
        try {
            if (!isBapperidaUser(req.user)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }
            const { type, id } = req.params;
            const tableMap = {
                visi: 'rpjmd_visi',
                misi: 'rpjmd_misi',
                tujuan: 'rpjmd_tujuan',
                sasaran: 'rpjmd_sasaran'
            };
            const tableName = tableMap[type];
            if (!tableName) return res.status(400).json({ success: false, message: 'Tipe item tidak valid' });

            await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
            res.json({ success: true, message: `Item ${type.toUpperCase()} RPJMD berhasil dihapus` });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 6. Get Renstra Data (Tujuan OPD -> Sub-Kegiatan + Status Verifikasi)
    getRenstra: async (req, res) => {
        try {
            const { periode_id, instansi_id } = req.query;
            let targetInstansiId = instansi_id || req.user?.instansi_id;

            if (!targetInstansiId) {
                return res.status(400).json({ success: false, message: 'Instansi ID wajib dispesifikasikan' });
            }

            let targetPeriodeId = periode_id;
            if (!targetPeriodeId) {
                const [activePeriod] = await pool.query('SELECT id FROM rpjmd_periode WHERE is_active = TRUE LIMIT 1');
                targetPeriodeId = activePeriod[0]?.id || 1;
            }

            // Get verification status
            const [verifikasi] = await pool.query(
                'SELECT * FROM renstra_verifikasi WHERE periode_id = ? AND instansi_id = ?',
                [targetPeriodeId, targetInstansiId]
            );

            // Get Sub Kegiatan OPD
            const [subKegiatanList] = await pool.query(`
                SELECT rsk.*, rs.sasaran as renstra_sasaran_nama, rjs.sasaran as rpjmd_sasaran_nama
                FROM renstra_sub_kegiatan rsk
                LEFT JOIN renstra_sasaran rs ON rsk.renstra_sasaran_id = rs.id
                LEFT JOIN renstra_tujuan rt ON rs.renstra_tujuan_id = rt.id
                LEFT JOIN rpjmd_sasaran rjs ON rt.rpjmd_sasaran_id = rjs.id
                WHERE rsk.periode_id = ? AND rsk.instansi_id = ?
                ORDER BY rsk.kode_program ASC, rsk.kode_kegiatan ASC, rsk.kode_sub_kegiatan ASC
            `, [targetPeriodeId, targetInstansiId]);

            res.json({
                success: true,
                periode_id: targetPeriodeId,
                instansi_id: targetInstansiId,
                verifikasi: verifikasi[0] || { status: 'draft', is_locked: false, catatan_bapperida: '' },
                data: subKegiatanList
            });
        } catch (err) {
            console.error('Error in getRenstra:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 7. Save / Update Sub-Kegiatan Renstra 5 Tahunan
    saveRenstraSubKegiatan: async (req, res) => {
        try {
            const {
                id, periode_id, instansi_id, renstra_sasaran_id,
                kode_program, nama_program, kode_kegiatan, nama_kegiatan, kode_sub_kegiatan, nama_sub_kegiatan,
                indikator, satuan, baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir,
                pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5
            } = req.body;

            const targetInstansiId = instansi_id || req.user?.instansi_id;
            const isBapperida = isBapperidaUser(req.user);

            // Access check: OPD can only edit their own instansi unless Bapperida
            if (!isBapperida && Number(targetInstansiId) !== Number(req.user?.instansi_id)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak: Tidak dapat mengedit Renstra OPD lain' });
            }

            // Lock check
            const [verifikasi] = await pool.query(
                'SELECT is_locked, status FROM renstra_verifikasi WHERE periode_id = ? AND instansi_id = ?',
                [periode_id, targetInstansiId]
            );

            if (verifikasi[0]?.is_locked && !isBapperida) {
                return res.status(403).json({ success: false, message: 'Data Renstra telah dikunci oleh Bapperida. Hubungi admin untuk mengajukan perbaikan.' });
            }

            const paguTotal = (Number(pagu_t1) || 0) + (Number(pagu_t2) || 0) + (Number(pagu_t3) || 0) + (Number(pagu_t4) || 0) + (Number(pagu_t5) || 0);

            if (id) {
                await pool.query(`
                    UPDATE renstra_sub_kegiatan SET
                        renstra_sasaran_id = ?, kode_program = ?, nama_program = ?, kode_kegiatan = ?, nama_kegiatan = ?,
                        kode_sub_kegiatan = ?, nama_sub_kegiatan = ?, indikator = ?, satuan = ?, baseline_t0 = ?,
                        target_t1 = ?, target_t2 = ?, target_t3 = ?, target_t4 = ?, target_t5 = ?, target_akhir = ?,
                        pagu_t1 = ?, pagu_t2 = ?, pagu_t3 = ?, pagu_t4 = ?, pagu_t5 = ?, pagu_total = ?
                    WHERE id = ?
                `, [
                    renstra_sasaran_id || null, kode_program, nama_program, kode_kegiatan, nama_kegiatan,
                    kode_sub_kegiatan, nama_sub_kegiatan, indikator, satuan, baseline_t0,
                    target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir,
                    pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5, paguTotal, id
                ]);
            } else {
                await pool.query(`
                    INSERT INTO renstra_sub_kegiatan
                    (periode_id, instansi_id, renstra_sasaran_id, kode_program, nama_program, kode_kegiatan, nama_kegiatan, kode_sub_kegiatan, nama_sub_kegiatan, indikator, satuan, baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir, pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5, pagu_total)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    periode_id, targetInstansiId, renstra_sasaran_id || null, kode_program, nama_program, kode_kegiatan, nama_kegiatan, kode_sub_kegiatan, nama_sub_kegiatan, indikator, satuan, baseline_t0, target_t1, target_t2, target_t3, target_t4, target_t5, target_akhir, pagu_t1, pagu_t2, pagu_t3, pagu_t4, pagu_t5, paguTotal
                ]);
            }

            res.json({ success: true, message: 'Sub-Kegiatan Renstra 5 Tahunan berhasil disimpan' });
        } catch (err) {
            console.error('Error in saveRenstraSubKegiatan:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 8. Delete Sub-Kegiatan Renstra
    deleteRenstraSubKegiatan: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM renstra_sub_kegiatan WHERE id = ?', [id]);
            res.json({ success: true, message: 'Item Sub-Kegiatan Renstra berhasil dihapus' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 9. Submit Renstra PD to Bapperida
    submitRenstra: async (req, res) => {
        try {
            const { periode_id, instansi_id } = req.body;
            const targetInstansiId = instansi_id || req.user?.instansi_id;

            await pool.query(`
                INSERT INTO renstra_verifikasi (periode_id, instansi_id, status, submitted_at)
                VALUES (?, ?, 'submitted', NOW())
                ON DUPLICATE KEY UPDATE status = 'submitted', submitted_at = NOW()
            `, [periode_id, targetInstansiId]);

            res.json({ success: true, message: 'Renstra berhasil diajukan ke Bapperida untuk verifikasi' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 10. Bapperida Verification & Locking
    verifyRenstra: async (req, res) => {
        try {
            if (!isBapperidaUser(req.user)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Bapperida yang dapat melakukan verifikasi' });
            }

            const { periode_id, instansi_id, status, is_locked, catatan_bapperida } = req.body;

            await pool.query(`
                INSERT INTO renstra_verifikasi (periode_id, instansi_id, status, is_locked, catatan_bapperida, verified_by, verified_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status),
                    is_locked = VALUES(is_locked),
                    catatan_bapperida = VALUES(catatan_bapperida),
                    verified_by = VALUES(verified_by),
                    verified_at = NOW()
            `, [periode_id, instansi_id, status, is_locked ? 1 : 0, catatan_bapperida || '', req.user?.id || null]);

            res.json({ success: true, message: `Status Renstra berhasil diperbarui ke '${status}'` });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 11. QAF: Toggle Quick Access
    toggleQuickAccess: async (req, res) => {
        try {
            const { id } = req.body;
            const [rows] = await pool.query('SELECT is_quick_access FROM renstra_sub_kegiatan WHERE id = ?', [id]);
            if (!rows.length) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });

            const newStatus = !rows[0].is_quick_access;
            await pool.query('UPDATE renstra_sub_kegiatan SET is_quick_access = ? WHERE id = ?', [newStatus, id]);

            res.json({
                success: true,
                is_quick_access: newStatus,
                message: newStatus ? 'Berhasil ditambahkan ke Quick Access' : 'Dihapus dari Quick Access'
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = rpjmdRenstraController;
