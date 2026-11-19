const pool = require('../../../config/db');
const notificationService = require('../../system/services/notificationService');

// Get activities for all employees in a bidang for a specific month/year
const getMonthlyActivities = async (req, res) => {
    try {
        const { instansi_id, bidang_id, month, year } = req.query;

        // Base query for employees in the bidang/instansi
        let query = `
            SELECT 
                p.id as profil_id,
                p.nama_lengkap,
                p.bidang_id,
                p.instansi_id,
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
                a.id_kegiatan_eksternal, a.nama_kegiatan, a.lampiran_kegiatan, a.keterangan,
                k.petugas_ids, k.tanggal as tanggal_kegiatan, k.tanggal_akhir as tanggal_akhir_kegiatan,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', d.id, 
                            'nama_file', d.nama_file, 
                            'path', d.path, 
                            'tipe_dokumen', COALESCE(kd.tipe_dokumen, 'laporan'),
                            'dokumen_id', d.id
                        )
                    )
                    FROM dokumen_upload d
                    LEFT JOIN kegiatan_manajemen_dokumen kd ON d.id = kd.dokumen_id AND kd.kegiatan_id = a.id_kegiatan_eksternal
                    WHERE FIND_IN_SET(d.id, a.lampiran_kegiatan) AND d.is_deleted = 0
                ) as lampiran_docs
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

            const pIds = a.petugas_ids ? String(a.petugas_ids).split(',').map(s => s.trim()).filter(Boolean) : [];

            activityMap[a.profil_pegawai_id][day][a.sesi].push({
                id: a.id,
                tipe: a.tipe_kegiatan || 'RM',
                id_eksternal: a.id_kegiatan_eksternal,
                nama: a.nama_kegiatan,
                lampiran: a.lampiran_kegiatan,
                lampiran_docs: typeof a.lampiran_docs === 'string' ? JSON.parse(a.lampiran_docs) : (a.lampiran_docs || []),
                keterangan: a.keterangan,
                petugas_ids: a.petugas_ids,
                petugas_count: pIds.length,
                tanggal_kegiatan: a.tanggal_kegiatan,
                tanggal_akhir_kegiatan: a.tanggal_akhir_kegiatan
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
        const isSelf = req.user.profil_pegawai_id === Number(profil_pegawai_id);
        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        // 1. Level Access Definition (Dynamic from DB)
        const [scopeRows] = await pool.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;
        const isStandardUser = dbScope === 1;

        // Fetch existing record if id is provided or look up by profil_pegawai_id + tanggal + sesi
        let existingRecord = null;
        let effectiveExternalId = id_kegiatan_eksternal ? String(id_kegiatan_eksternal).trim() : null;

        if (id) {
            const [existingRows] = await pool.query(
                'SELECT id, profil_pegawai_id, tanggal, sesi, tipe_kegiatan, id_kegiatan_eksternal FROM kegiatan_harian_pegawai WHERE id = ?',
                [id]
            );
            if (existingRows.length > 0) {
                existingRecord = existingRows[0];
                if (!effectiveExternalId && existingRecord.id_kegiatan_eksternal) {
                    effectiveExternalId = String(existingRecord.id_kegiatan_eksternal).trim();
                }
            }
        }

        if (!effectiveExternalId && !tipe_kegiatan && profil_pegawai_id && tanggal) {
            const deleteSesi = (sesi === 'Both') ? '%' : (sesi || 'Pagi');
            const [matchingRows] = await pool.query(
                'SELECT id, profil_pegawai_id, tanggal, sesi, tipe_kegiatan, id_kegiatan_eksternal FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ? AND sesi LIKE ?',
                [profil_pegawai_id, tanggal, deleteSesi]
            );
            const extRow = matchingRows.find(r => r.id_kegiatan_eksternal);
            if (extRow) {
                effectiveExternalId = String(extRow.id_kegiatan_eksternal).trim();
            }
        }

        // 2. Fetch Target's Scope
        const [targetRows] = await pool.query('SELECT instansi_id, bidang_id FROM profil_pegawai WHERE id = ?', [profil_pegawai_id]);
        if (targetRows.length === 0) return res.status(404).json({ success: false, message: 'Target pegawai tidak ditemukan' });
        const target = targetRows[0];

        // 3. Permission Enforcement
        let hasAccess = false;
        let isLimitedUploadOnly = false;

        if (isGlobal) {
            hasAccess = true;
        } else if (isInstansiLevel) {
            if (userInstansiId === target.instansi_id) hasAccess = true;
        } else if (isBidangLevel) {
            if (userInstansiId === target.instansi_id && userBidangId === target.bidang_id) hasAccess = true;
        } else if (isSelf) {
            hasAccess = true;
        }

        // Check if tagged in central activity for special handling/restrictions
        if (effectiveExternalId) {
            const [kegCentral] = await pool.query('SELECT petugas_ids FROM kegiatan_manajemen WHERE id = ?', [effectiveExternalId]);
            if (kegCentral.length > 0) {
                const petugasIds = String(kegCentral[0].petugas_ids || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
                if (petugasIds.includes(req.user.profil_pegawai_id)) {
                    hasAccess = true;
                    isLimitedUploadOnly = true; // Use this to lock metadata later
                }
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk mengedit kegiatan ini.' });
        }

        // 4. Deletion check & Sync with Central Attendance
        if (!tipe_kegiatan) {
            const isAuthorizedToDelete = dbScope >= 2 || isInstansiLevel || isGlobal; // Admin Bidang, Instansi, or Global

            // If it's a tagged activity, regular users CANNOT delete it
            if (effectiveExternalId && isLimitedUploadOnly && !isAuthorizedToDelete) {
                return res.status(403).json({ success: false, message: 'Hanya Admin Bidang atau atasan yang dapat menghapus/melepas penugasan kegiatan terpusat.' });
            }

            // Perform Deletion & Sync
            if (effectiveExternalId && isAuthorizedToDelete) {
                // Delete sessions for this user on this external activity (specific date if provided, otherwise all)
                if (tanggal) {
                    await pool.query(
                        'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND id_kegiatan_eksternal = ? AND tanggal = ?',
                        [profil_pegawai_id, effectiveExternalId, tanggal]
                    );
                } else {
                    await pool.query(
                        'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND id_kegiatan_eksternal = ?',
                        [profil_pegawai_id, effectiveExternalId]
                    );
                }

                // Check if user still has remaining days on this external activity
                const [remainingRows] = await pool.query(
                    'SELECT id FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND id_kegiatan_eksternal = ? LIMIT 1',
                    [profil_pegawai_id, effectiveExternalId]
                );
                const hasRemainingDays = remainingRows.length > 0;

                // Fetch current central activity to safely update petugas_ids and bidang_ids if no remaining days
                const [kegCentral] = await pool.query(
                    'SELECT id, petugas_ids, bidang_ids, nama_kegiatan FROM kegiatan_manajemen WHERE id = ?',
                    [effectiveExternalId]
                );

                if (kegCentral.length > 0) {
                    const currentPetugas = String(kegCentral[0].petugas_ids || '')
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean);

                    // Only remove from central activity if officer has NO other remaining days
                    if (!hasRemainingDays) {
                        const [targetUserRows] = await pool.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [profil_pegawai_id]);
                        const removedName = targetUserRows.length > 0 ? targetUserRows[0].nama_lengkap : `Pegawai #${profil_pegawai_id}`;
                        const updatedPetugas = currentPetugas.filter(pid => String(pid) !== String(profil_pegawai_id));

                        if (updatedPetugas.length === 0) {
                            // Satu-satunya petugas dihapus -> Otomatis pindahkan kegiatan ke TEMPAT SAMPAH!
                            await pool.query(
                                'UPDATE kegiatan_manajemen SET is_deleted = 1, deleted_at = NOW(), updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                [userId, effectiveExternalId]
                            );
                            await pool.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(effectiveExternalId)]);

                            await pool.query(
                                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                                [effectiveExternalId, userId, 'delete', `Kegiatan otomatis dipindahkan ke Tempat Sampah karena satu-satunya petugas ('${removedName}') dihapus via Logbook Perorang`]
                            );
                        } else {
                            // Masih ada petugas lain -> Update petugas_ids & bidang_ids
                            const newPetugasIds = updatedPetugas.join(',');
                            let newBidangIds = '';
                            if (updatedPetugas.length > 0) {
                                const [bidangRows] = await pool.query(
                                    'SELECT DISTINCT bidang_id FROM profil_pegawai WHERE id IN (?) AND bidang_id IS NOT NULL',
                                    [updatedPetugas.map(Number)]
                                );
                                newBidangIds = bidangRows.map(r => r.bidang_id).join(',');
                            }

                            await pool.query(
                                'UPDATE kegiatan_manajemen SET petugas_ids = ?, bidang_ids = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                [newPetugasIds, newBidangIds, userId, effectiveExternalId]
                            );

                            await pool.query(
                                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                                [effectiveExternalId, userId, 'edit', `Petugas "${removedName}" [ID:${profil_pegawai_id}] dihapus dari kegiatan via Logbook Perorang`]
                            );
                        }

                        // Dismiss any active tagihan_dokumen notifications for this user on this activity
                        try {
                            await pool.query(
                                "UPDATE notifications n INNER JOIN users u ON n.user_id = u.id SET n.is_read = 1 WHERE n.type = 'tagihan_dokumen' AND n.link LIKE ? AND u.profil_pegawai_id = ?",
                                [`kegiatan:${effectiveExternalId}:%`, profil_pegawai_id]
                            );
                        } catch (e) {
                            console.error('Failed to update notifications for untagged officer:', e);
                        }
                    } else {
                        // Masih ada hari lain (kegiatan multi-hari) -> Catat history bahwa pada tanggal ini dihapus
                        const [targetUserRows] = await pool.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [profil_pegawai_id]);
                        const removedName = targetUserRows.length > 0 ? targetUserRows[0].nama_lengkap : `Pegawai #${profil_pegawai_id}`;
                        await pool.query(
                            'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                            [effectiveExternalId, userId, 'edit', `Petugas "${removedName}" [ID:${profil_pegawai_id}] dihapus dari kegiatan khusus pada tanggal ${tanggal} via Logbook Perorang`]
                        );
                    }
                }
            } else {
                // Manual or Local Deletion (pure local logbook record not linked to central activity)
                if (id) {
                    const rowTipe = existingRecord ? existingRecord.tipe_kegiatan : null;
                    const rowPegawaiId = existingRecord ? existingRecord.profil_pegawai_id : profil_pegawai_id;
                    const rowTanggal = existingRecord ? existingRecord.tanggal : tanggal;
                    const isFullDayType = ['C', 'S', 'DL', 'DLB'].includes(rowTipe);
                    if (isFullDayType) {
                        await pool.query(
                            'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ? AND tipe_kegiatan = ?',
                            [rowPegawaiId, rowTanggal, rowTipe]
                        );
                    } else {
                        await pool.query('DELETE FROM kegiatan_harian_pegawai WHERE id = ?', [id]);
                    }
                } else {
                    const deleteSesi = (sesi === 'Both') ? '%' : (sesi || 'Pagi');
                    await pool.query(
                        'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ? AND sesi LIKE ?',
                        [profil_pegawai_id, tanggal, deleteSesi]
                    );
                }
            }
            return res.json({ success: true, message: 'Kegiatan berhasil dihapus dan daftar petugas diperbarui.' });
        }

        // 5. Enforce Limited Access (Tagged User can only edit attachments/keterangan)
        if (isLimitedUploadOnly && id) {
             const [currentRows] = await pool.query('SELECT * FROM kegiatan_harian_pegawai WHERE id = ?', [id]);
             if (currentRows.length > 0) {
                 const current = currentRows[0];
                 const currentTanggal = new Date(current.tanggal).toISOString().split('T')[0];
                 const normalizedTanggal = (tanggal && typeof tanggal === 'string' && tanggal.includes('T'))
                     ? tanggal.split('T')[0]
                     : tanggal;
                 
                 // If trying to change anything other than lampiran or keterangan
                 if ((current.nama_kegiatan || '').trim() !== (nama_kegiatan || '').trim() || 
                     current.tipe_kegiatan !== tipe_kegiatan || 
                     currentTanggal !== normalizedTanggal || 
                     (current.sesi || '').trim() !== (sesi || '').trim()) {
                     return res.status(403).json({ success: false, message: 'Sebagai petugas, Anda hanya diperbolehkan mengedit lampiran, tematik, dan tambahan keterangan pada kegiatan ini.' });
                 }
             }
        }

        const isFullDayType = ['C', 'S', 'DL', 'DLB'].includes(tipe_kegiatan);
        
        if (isFullDayType) {
            // If inserting Cuti or Sakit, find any existing external activities on this date to log history and update central activity
            if (['C', 'S'].includes(tipe_kegiatan)) {
                try {
                    const [existingDinas] = await pool.query(`
                        SELECT DISTINCT id_kegiatan_eksternal 
                        FROM kegiatan_harian_pegawai 
                        WHERE profil_pegawai_id = ? AND tanggal = ? 
                          AND id_kegiatan_eksternal IS NOT NULL AND id_kegiatan_eksternal != ''
                          AND tipe_kegiatan NOT LIKE 'C%' AND tipe_kegiatan NOT LIKE 'S%'
                    `, [profil_pegawai_id, tanggal]);

                    if (existingDinas.length > 0) {
                        const [targetRows] = await pool.query('SELECT nama_lengkap FROM profil_pegawai WHERE id = ?', [profil_pegawai_id]);
                        const empName = targetRows.length > 0 ? targetRows[0].nama_lengkap : `Pegawai #${profil_pegawai_id}`;
                        const jenisTeks = tipe_kegiatan === 'C' ? 'Cuti' : 'Sakit';

                        for (const ed of existingDinas) {
                            if (ed.id_kegiatan_eksternal) {
                                // Check if this officer still has other remaining days on this central activity
                                const [remaining] = await pool.query(`
                                    SELECT id FROM kegiatan_harian_pegawai 
                                    WHERE profil_pegawai_id = ? AND id_kegiatan_eksternal = ? AND tanggal != ?
                                    LIMIT 1
                                `, [profil_pegawai_id, ed.id_kegiatan_eksternal, tanggal]);
                                const hasRemainingDays = remaining.length > 0;

                                const [kegCentral] = await pool.query(
                                    'SELECT id, petugas_ids, nama_kegiatan FROM kegiatan_manajemen WHERE id = ?',
                                    [ed.id_kegiatan_eksternal]
                                );

                                if (kegCentral.length > 0) {
                                    const currentPetugas = String(kegCentral[0].petugas_ids || '').split(',').map(s => s.trim()).filter(Boolean);

                                    if (!hasRemainingDays) {
                                        const updatedPetugas = currentPetugas.filter(pid => String(pid) !== String(profil_pegawai_id));

                                        if (updatedPetugas.length === 0) {
                                            // SATU-SATUNYA PETUGAS DITIMPA CUTI/SAKIT -> PINDAHKAN KE TEMPAT SAMPAH!
                                            await pool.query(
                                                'UPDATE kegiatan_manajemen SET is_deleted = 1, deleted_at = NOW(), updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                                [userId, ed.id_kegiatan_eksternal]
                                            );
                                            await pool.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [String(ed.id_kegiatan_eksternal)]);

                                            await pool.query(
                                                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                                                [ed.id_kegiatan_eksternal, userId, 'delete', `Kegiatan otomatis dipindahkan ke Tempat Sampah karena satu-satunya petugas ('${empName}') digantikan dengan ${jenisTeks} pada tanggal ${tanggal}`]
                                            );
                                        } else {
                                            // Masih ada petugas lain -> Lepaskan petugas ini dari daftar petugas kegiatan
                                            const newPetugasIds = updatedPetugas.join(',');
                                            const [bidangRows] = await pool.query(
                                                'SELECT DISTINCT bidang_id FROM profil_pegawai WHERE id IN (?) AND bidang_id IS NOT NULL',
                                                [updatedPetugas.map(Number)]
                                            );
                                            const newBidangIds = bidangRows.map(r => r.bidang_id).join(',');

                                            await pool.query(
                                                'UPDATE kegiatan_manajemen SET petugas_ids = ?, bidang_ids = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                                [newPetugasIds, newBidangIds, userId, ed.id_kegiatan_eksternal]
                                            );

                                            await pool.query(
                                                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                                                [ed.id_kegiatan_eksternal, userId, 'edit', `Petugas "${empName}" [ID:${profil_pegawai_id}] digantikan dengan ${jenisTeks} pada tanggal ${tanggal} dan dilepas dari daftar petugas kegiatan`]
                                            );
                                        }
                                    } else {
                                        // Masih ada hari lain (kegiatan multi-hari) -> Hanya catat history ketidakhadiran pada tanggal ini
                                        await pool.query(
                                            'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                                            [ed.id_kegiatan_eksternal, userId, 'edit', `Petugas "${empName}" [ID:${profil_pegawai_id}] tidak hadir / digantikan dengan ${jenisTeks} pada tanggal ${tanggal}`]
                                        );
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to log cuti/sakit replacement in history:', e);
                }
            }

            // Remove any existing entries for this employee on this date
            await pool.query(
                'DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ?',
                [profil_pegawai_id, tanggal]
            );

            // Insert both sessions
            for (const s of ['Pagi', 'Siang']) {
                await pool.query(`
                    INSERT INTO kegiatan_harian_pegawai (
                        profil_pegawai_id, tanggal, sesi, tipe_kegiatan, 
                        id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan, 
                        created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    profil_pegawai_id, tanggal, s, tipe_kegiatan,
                    id_kegiatan_eksternal || null, nama_kegiatan || '', lampiran_kegiatan || '', keterangan || '',
                    userId, userId
                ]);
            }
        } else {
            await pool.query(`
                INSERT INTO kegiatan_harian_pegawai (id, profil_pegawai_id, tanggal, sesi, tipe_kegiatan, id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE tipe_kegiatan = ?, nama_kegiatan = ?, lampiran_kegiatan = ?, keterangan = ?, updated_by = ?
            `, [
                id || null, profil_pegawai_id, tanggal, sesi || 'Pagi', tipe_kegiatan, id_kegiatan_eksternal || null, nama_kegiatan || '', lampiran_kegiatan || '', keterangan || '', userId, userId,
                tipe_kegiatan, nama_kegiatan || '', lampiran_kegiatan || '', keterangan || '', userId
            ]);
        }

        // --- Post-save: Reminder notification for Cuti/Sakit without uploaded document ---
        // Only trigger for Cuti (C) or Sakit (S) types
        if (['C', 'S'].includes(tipe_kegiatan)) {
            try {
                const hasLampiran = lampiran_kegiatan && String(lampiran_kegiatan).trim() !== '';
                const notifType = 'REMINDER_BERKAS_CUTI_SAKIT';
                const notifLink = `/logbook/per-orang?profil=${profil_pegawai_id}&tanggal=${tanggal}`;
                const jenisTeks = tipe_kegiatan === 'C' ? 'Cuti' : 'Sakit';

                // Find the pegawai's bidang_id and nama_lengkap
                const [pegawaiRows] = await pool.query(
                    'SELECT bidang_id, nama_lengkap FROM profil_pegawai WHERE id = ?',
                    [profil_pegawai_id]
                );

                if (pegawaiRows.length > 0) {
                    const { bidang_id: pegawaiBidangId, nama_lengkap: namaPegawai } = pegawaiRows[0];

                    // Find the user ID of the employee
                    const [userRows] = await pool.query(
                        'SELECT id FROM users WHERE profil_pegawai_id = ?',
                        [profil_pegawai_id]
                    );
                    const pegawaiUserId = userRows.length > 0 ? userRows[0].id : null;

                    if (hasLampiran) {
                        // Berkas sudah diupload → hapus semua unread reminder untuk kegiatan ini
                        if (pegawaiUserId) {
                            await pool.query(
                                `DELETE FROM notifications WHERE user_id = ? AND type = ? AND link = ? AND is_read = 0`,
                                [pegawaiUserId, notifType, notifLink]
                            );
                        }
                        // Hapus juga dari admin bidang
                        const [adminRows] = await pool.query(
                            `SELECT u.id FROM users u
                            INNER JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                            WHERE pp.bidang_id = ? AND pp.tipe_user_id = 4`,
                            [pegawaiBidangId]
                        );
                        for (const admin of adminRows) {
                            await pool.query(
                                `DELETE FROM notifications WHERE user_id = ? AND type = ? AND link = ? AND is_read = 0`,
                                [admin.id, notifType, notifLink]
                            );
                        }
                    } else {
                        // Belum ada berkas → kirim notifikasi reminder (cegah duplikat unread)
                        const title = `📋 Berkas ${jenisTeks} Belum Diupload`;
                        const message = `Kegiatan ${jenisTeks} pada tanggal ${tanggal} belum memiliki dokumen pendukung. Segera upload berkasnya.`;

                        if (pegawaiUserId) {
                            // Cek apakah sudah ada unread notif reminder ini untuk user ini
                            const [existingNotif] = await pool.query(
                                `SELECT id FROM notifications WHERE user_id = ? AND type = ? AND link = ? AND is_read = 0 LIMIT 1`,
                                [pegawaiUserId, notifType, notifLink]
                            );
                            if (existingNotif.length === 0) {
                                await notificationService.send(pegawaiUserId, title, message, notifType, notifLink);
                            }
                        }

                        // Notifikasi ke admin bidang
                        const adminTitle = `📋 ${namaPegawai} — Berkas ${jenisTeks} Belum Diupload`;
                        const adminMessage = `${namaPegawai} memiliki kegiatan ${jenisTeks} pada tanggal ${tanggal} yang belum ada dokumen berkasnya.`;

                        const [adminRows] = await pool.query(
                            `SELECT u.id FROM users u
                            INNER JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                            WHERE pp.bidang_id = ? AND pp.tipe_user_id = 4`,
                            [pegawaiBidangId]
                        );
                        for (const admin of adminRows) {
                            const [existingAdminNotif] = await pool.query(
                                `SELECT id FROM notifications WHERE user_id = ? AND type = ? AND link = ? AND is_read = 0 LIMIT 1`,
                                [admin.id, notifType, notifLink]
                            );
                            if (existingAdminNotif.length === 0) {
                                await notificationService.send(admin.id, adminTitle, adminMessage, notifType, notifLink);
                            }
                        }
                    }
                }
            } catch (notifErr) {
                // Jangan gagalkan response utama jika notifikasi error
                console.error('[NotifReminder] Error sending leave/sick reminder:', notifErr.message);
            }
        }

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
                p.bidang_id,
                p.instansi_id,
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
