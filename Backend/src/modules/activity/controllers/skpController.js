const pool = require('../../../config/db');

const skpController = {
    getPublicPegawai: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT pp.id, pp.nama, pp.nama_lengkap, pp.bidang_id, jp.nama as jenis_pegawai_nama, j.nama as jabatan_nama
                FROM profil_pegawai pp
                LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                WHERE pp.is_active = 1 AND (jp.nama = 'PNS' OR jp.nama = 'PPPK Penuh Waktu')
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching public pegawai for SKP:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getPublicBidang: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    b.id, 
                    b.nama_bidang, 
                    b.singkatan, 
                    i.instansi as nama_instansi
                FROM master_bidang_instansi b
                LEFT JOIN master_instansi_daerah i ON b.instansi_id = i.id
                ORDER BY b.id ASC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching public bidang for SKP:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getPublicMapping: async (req, res) => {
        try {
            const [subKegiatanMappings] = await pool.query(`
                SELECT 
                    mski.id as mapping_id, msk.id as sub_kegiatan_id, msk.nama_sub_kegiatan, msk.kode_sub_kegiatan,
                    mk.id as kegiatan_id, mk.nama_kegiatan,
                    mp.id as program_id, mp.nama_program,
                    mbu.id as urusan_id, mbu.urusan as nama_urusan,
                    mski.instansi_id, mi.instansi as nama_instansi, mi.singkatan as singkatan_instansi,
                    mski.penanggung_jawab_id, p.nama_lengkap as nama_penanggung_jawab, j.jabatan as nama_jabatan
                FROM mapping_sub_kegiatan_instansi mski
                JOIN master_sub_kegiatan msk ON mski.sub_kegiatan_id = msk.id
                JOIN master_kegiatan mk ON msk.kegiatan_id = mk.id
                JOIN master_program mp ON mk.program_id = mp.id
                JOIN master_bidang_urusan mbu ON mp.urusan_id = mbu.id
                LEFT JOIN master_instansi_daerah mi ON mski.instansi_id = mi.id
                LEFT JOIN profil_pegawai p ON mski.penanggung_jawab_id = p.id
                LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
                ORDER BY mbu.urusan ASC, mp.nama_program ASC, mk.nama_kegiatan ASC, msk.nama_sub_kegiatan ASC
            `);
            res.json({ success: true, data: { sub_kegiatan: subKegiatanMappings } });
        } catch (err) {
            console.error('Error fetching public mapping for SKP:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getPegawaiRecords: async (req, res) => {
        try {
            const { year, bidang_id } = req.query;
            if (!year || !bidang_id) {
                return res.status(400).json({ success: false, message: 'Year and bidang_id are required' });
            }
            const [rows] = await pool.query(`
                SELECT 
                    s.pegawai_id AS pegawaiId,
                    MAX(CASE WHEN s.kategori = 'perencanaan' THEN s.doc_name END) AS perencanaanDocName,
                    MAX(CASE WHEN s.kategori = 'perencanaan' THEN s.doc_id END) AS perencanaanDocId,
                    MAX(CASE WHEN s.kategori = 'perencanaan' THEN d.path END) AS perencanaanDocPath,
                    MAX(CASE WHEN s.kategori = 'perencanaan' THEN s.updated_at END) AS perencanaanUpdatedAt,
                    MAX(CASE WHEN s.kategori = 'penilaian' THEN s.doc_name END) AS penilaianDocName,
                    MAX(CASE WHEN s.kategori = 'penilaian' THEN s.doc_id END) AS penilaianDocId,
                    MAX(CASE WHEN s.kategori = 'penilaian' THEN d.path END) AS penilaianDocPath,
                    MAX(CASE WHEN s.kategori = 'penilaian' THEN s.updated_at END) AS penilaianUpdatedAt
                FROM skp_pegawai_docs s
                LEFT JOIN dokumen_upload d ON s.doc_id = d.id
                WHERE s.tahun = ? AND s.bidang_id = ?
                GROUP BY s.pegawai_id
            `, [year, bidang_id]);

            const [pendukung] = await pool.query(`
                SELECT 
                    s.pegawai_id AS pegawaiId,
                    s.bulan,
                    s.butir_skp AS butirSkp,
                    s.doc_name AS docName,
                    s.doc_id AS docId,
                    d.path AS docPath,
                    d.is_private,
                    d.uploaded_by,
                    s.updated_at AS updatedAt
                FROM skp_pegawai_docs s
                LEFT JOIN dokumen_upload d ON s.doc_id = d.id
                WHERE s.tahun = ? AND s.bidang_id = ? AND s.kategori = 'pendukung'
            `, [year, bidang_id]);

            res.json({ success: true, data: { records: rows, pendukung } });
        } catch (err) {
            console.error('Error fetching pegawai SKP records:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getSummary: async (req, res) => {
        try {
            const { bidang_id } = req.query;
            if (!bidang_id) {
                return res.status(400).json({ success: false, message: 'bidang_id is required' });
            }

            // Get total active eligible employees in the bidang
            const [empRows] = await pool.query(`
                SELECT COUNT(*) AS total 
                FROM profil_pegawai pp
                LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
                WHERE pp.bidang_id = ? AND pp.is_active = 1
                  AND (jp.nama = 'PNS' OR jp.nama = 'PPPK Penuh Waktu')
            `, [bidang_id]);
            const totalEmployees = empRows[0].total;

            // Get all years
            // Get all years dynamically from 2024 up to currentYear + 1
            const startYear = 2024;
            const currentYear = new Date().getFullYear();
            const endYear = Math.max(currentYear + 1, 2026);

            let years = [];
            for (let yr = startYear; yr <= endYear; yr++) {
                years.push(yr);
            }

            try {
                const [yrRows] = await pool.query('SELECT DISTINCT nama AS tahun FROM master_tahun WHERE nama >= 2024 ORDER BY nama DESC');
                const dbYears = yrRows.map(y => parseInt(y.tahun));
                years = Array.from(new Set([...years, ...dbYears]));
            } catch (e) {
                console.warn('Failed to query master_tahun:', e.message);
            }
            years.sort((a, b) => b - a);

            const summary = [];
            for (const year of years) {
                // Count perencanaan submitted
                const [perencanaanRows] = await pool.query(`
                    SELECT COUNT(DISTINCT pegawai_id) AS submitted 
                    FROM skp_pegawai_docs 
                    WHERE tahun = ? AND bidang_id = ? AND kategori = 'perencanaan' AND doc_id IS NOT NULL
                `, [year, bidang_id]);
                const perencanaanSubmitted = perencanaanRows[0].submitted;

                // Count penilaian submitted
                const [penilaianRows] = await pool.query(`
                    SELECT COUNT(DISTINCT pegawai_id) AS submitted 
                    FROM skp_pegawai_docs 
                    WHERE tahun = ? AND bidang_id = ? AND kategori = 'penilaian' AND doc_id IS NOT NULL
                `, [year, bidang_id]);
                const penilaianSubmitted = penilaianRows[0].submitted;

                // Get statuses of the submitted records
                const [perencanaanStatuses] = await pool.query(`
                    SELECT status FROM skp_pegawai_docs 
                    WHERE tahun = ? AND bidang_id = ? AND kategori = 'perencanaan' AND doc_id IS NOT NULL
                `, [year, bidang_id]);
                const [penilaianStatuses] = await pool.query(`
                    SELECT status FROM skp_pegawai_docs 
                    WHERE tahun = ? AND bidang_id = ? AND kategori = 'penilaian' AND doc_id IS NOT NULL
                `, [year, bidang_id]);

                const getOverallStatus = (statuses, submitted, total) => {
                    if (submitted === 0) return 'Draft';
                    const list = statuses.map(s => s.status);
                    if (list.includes('Revisi')) return 'Revisi';
                    if (submitted === total && list.every(s => s === 'Disetujui')) return 'Disetujui';
                    return 'Draft';
                };

                const perencanaanStatus = getOverallStatus(perencanaanStatuses, perencanaanSubmitted, totalEmployees);
                const penilaianStatus = getOverallStatus(penilaianStatuses, penilaianSubmitted, totalEmployees);

                // Fetch supporting/upload documents
                const [uploadRows] = await pool.query(`
                    SELECT d.nama_file 
                    FROM skp_pegawai_docs s
                    JOIN dokumen_upload d ON s.doc_id = d.id
                    WHERE s.tahun = ? AND s.bidang_id = ? AND s.kategori = 'pendukung'
                `, [year, bidang_id]);
                const uploadFiles = uploadRows.map(u => u.nama_file);

                summary.push({
                    tahun: year,
                    perencanaan: {
                        status: perencanaanStatus,
                        submitted: perencanaanSubmitted,
                        total: totalEmployees
                    },
                    penilaian: {
                        status: penilaianStatus,
                        submitted: penilaianSubmitted,
                        total: totalEmployees
                    },
                    upload: {
                        count: uploadFiles.length,
                        files: uploadFiles
                    }
                });
            }

            res.json({ success: true, data: summary });
        } catch (err) {
            console.error('Error fetching SKP summary:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    savePegawaiRecord: async (req, res) => {
        try {
            const { pegawai_id, tahun, bidang_id, kategori, doc_name, doc_id, status, bulan, butir_skp } = req.body;
            if (!pegawai_id || !tahun || !bidang_id || !kategori) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const userId = req.user ? req.user.id : 0;
            const userNama = req.user ? (req.user.nama_lengkap || req.user.nama || 'Sistem') : 'Sistem';

            // Query pegawai name for detailed history logs
            const [pegawaiRows] = await pool.query('SELECT nama FROM profil_pegawai WHERE id = ?', [pegawai_id]);
            const namaPegawai = pegawaiRows[0]?.nama || `Pegawai #${pegawai_id}`;

            const kategoriNames = {
                perencanaan: 'Perencanaan',
                penilaian: 'Penilaian Akhir',
                pendukung: 'Bahan Upload'
            };
            const katName = kategoriNames[kategori] || kategori;

            // If doc_name is null/falsy, it means we are deleting/unlinking
            if (!doc_name) {
                let deletedDocName = '';
                
                if (kategori === 'pendukung') {
                    const [existingDocs] = await pool.query(`
                        SELECT doc_name FROM skp_pegawai_docs 
                        WHERE pegawai_id = ? AND tahun = ? AND bidang_id = ? AND kategori = 'pendukung'
                          AND (bulan = ? OR (? IS NULL AND bulan IS NULL))
                          AND (butir_skp = ? OR (? IS NULL AND butir_skp IS NULL))
                          AND doc_id = ?
                    `, [pegawai_id, tahun, bidang_id, bulan || null, bulan || null, butir_skp || null, butir_skp || null, doc_id]);
                    if (existingDocs.length > 0) {
                        deletedDocName = existingDocs[0].doc_name;
                    }

                    const monthNames = [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ];
                    const mName = bulan ? monthNames[bulan - 1] : '';
                    let logKeterangan = `Menghapus dokumen pendukung "${deletedDocName || '-'}" dari SKP ${namaPegawai} bulan ${mName} pada butir "${butir_skp || '-'}" oleh ${userNama}`;

                    await pool.query(`
                        DELETE FROM skp_pegawai_docs 
                        WHERE pegawai_id = ? AND tahun = ? AND bidang_id = ? AND kategori = 'pendukung'
                          AND (bulan = ? OR (? IS NULL AND bulan IS NULL))
                          AND (butir_skp = ? OR (? IS NULL AND butir_skp IS NULL))
                          AND doc_id = ?
                    `, [pegawai_id, tahun, bidang_id, bulan || null, bulan || null, butir_skp || null, butir_skp || null, doc_id]);

                    // Log to skp_edit_history
                    await pool.query(`
                        INSERT INTO skp_edit_history 
                        (pegawai_id, user_id, tahun, bidang_id, kategori, bulan, butir_skp, aksi, keterangan)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [pegawai_id, userId, tahun, bidang_id, kategori, bulan || null, butir_skp || null, 'unlink', logKeterangan]);
                } else {
                    const [existingDocs] = await pool.query(`
                        SELECT doc_name FROM skp_pegawai_docs 
                        WHERE pegawai_id = ? AND tahun = ? AND bidang_id = ? AND kategori = ?
                    `, [pegawai_id, tahun, bidang_id, kategori]);
                    if (existingDocs.length > 0) {
                        deletedDocName = existingDocs[0].doc_name;
                    }

                    let logKeterangan = `Menghapus dokumen "${deletedDocName || '-'}" dari SKP ${namaPegawai} pada kategori ${katName} oleh ${userNama}`;

                    await pool.query(`
                        DELETE FROM skp_pegawai_docs 
                        WHERE pegawai_id = ? AND tahun = ? AND bidang_id = ? AND kategori = ?
                    `, [pegawai_id, tahun, bidang_id, kategori]);

                    // Log to skp_edit_history
                    await pool.query(`
                        INSERT INTO skp_edit_history 
                        (pegawai_id, user_id, tahun, bidang_id, kategori, bulan, butir_skp, aksi, keterangan)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [pegawai_id, userId, tahun, bidang_id, kategori, bulan || null, butir_skp || null, 'unlink', logKeterangan]);
                }

                return res.json({ success: true, message: 'Record unlinked successfully' });
            }

            let existingQuery = '';
            let existingParams = [];

            if (kategori === 'pendukung') {
                // For supporting files, allow multiple files by identifying each by doc_id
                existingQuery = `
                    SELECT id FROM skp_pegawai_docs 
                    WHERE pegawai_id = ? AND tahun = ? AND bidang_id = ? AND kategori = ? AND doc_id = ?
                      AND (bulan = ? OR (? IS NULL AND bulan IS NULL))
                      AND (butir_skp = ? OR (? IS NULL AND butir_skp IS NULL))
                `;
                existingParams = [
                    pegawai_id, tahun, bidang_id, kategori, doc_id,
                    bulan || null, bulan || null,
                    butir_skp || null, butir_skp || null
                ];
            } else {
                // For perencanaan / penilaian, only allow one document per category
                existingQuery = `
                    SELECT id FROM skp_pegawai_docs 
                    WHERE pegawai_id = ? AND tahun = ? AND bidang_id = ? AND kategori = ?
                `;
                existingParams = [pegawai_id, tahun, bidang_id, kategori];
            }

            const [existing] = await pool.query(existingQuery, existingParams);

            let logKeterangan = `Mengunggah dokumen "${doc_name}" untuk SKP ${namaPegawai} pada kategori ${katName} oleh ${userNama}`;
            if (kategori === 'pendukung') {
                const monthNames = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                const mName = bulan ? monthNames[bulan - 1] : '';
                logKeterangan = `Mengunggah dokumen "${doc_name}" untuk SKP ${namaPegawai} bulan ${mName} pada butir "${butir_skp || '-'}" oleh ${userNama}`;
            }

            if (existing.length > 0) {
                await pool.query(`
                    UPDATE skp_pegawai_docs 
                    SET doc_name = ?, doc_id = ?, status = ?, updated_at = NOW() 
                    WHERE id = ?
                `, [doc_name, doc_id, status || 'Draft', existing[0].id]);
            } else {
                await pool.query(`
                    INSERT INTO skp_pegawai_docs (pegawai_id, tahun, bidang_id, kategori, bulan, butir_skp, doc_name, doc_id, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    pegawai_id,
                    tahun,
                    bidang_id,
                    kategori,
                    kategori === 'pendukung' ? (bulan || null) : null,
                    kategori === 'pendukung' ? (butir_skp || null) : null,
                    doc_name,
                    doc_id,
                    status || 'Draft'
                ]);
            }

            // Log to skp_edit_history
            await pool.query(`
                INSERT INTO skp_edit_history 
                (pegawai_id, user_id, tahun, bidang_id, kategori, bulan, butir_skp, aksi, keterangan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [pegawai_id, userId, tahun, bidang_id, kategori, bulan || null, butir_skp || null, 'upload', logKeterangan]);

            res.json({ success: true, message: 'Record saved successfully' });
        } catch (err) {
            console.error('Error saving pegawai SKP record:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getMonthlyLinks: async (req, res) => {
        try {
            const { bidang_id } = req.query;
            if (!bidang_id) {
                return res.status(400).json({ success: false, message: 'bidang_id is required' });
            }
            const [rows] = await pool.query(`
                SELECT tahun, bidang_id, butir_skp, bulan, link_url 
                FROM skp_monthly_links 
                WHERE bidang_id = ?
            `, [bidang_id]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching SKP monthly links:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    saveMonthlyLink: async (req, res) => {
        try {
            const { tahun, bidang_id, butir_skp, bulan, link_url } = req.body;
            if (!tahun || !bidang_id || !butir_skp || !bulan) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const [existing] = await pool.query(`
                SELECT id FROM skp_monthly_links 
                WHERE tahun = ? AND bidang_id = ? AND butir_skp = ? AND bulan = ?
            `, [tahun, bidang_id, butir_skp, bulan]);

            if (existing.length > 0) {
                await pool.query(`
                    UPDATE skp_monthly_links SET link_url = ?, updated_at = NOW() WHERE id = ?
                `, [link_url, existing[0].id]);
            } else {
                await pool.query(`
                    INSERT INTO skp_monthly_links (tahun, bidang_id, butir_skp, bulan, link_url) 
                    VALUES (?, ?, ?, ?, ?)
                `, [tahun, bidang_id, butir_skp, bulan, link_url]);
            }

            res.json({ success: true, message: 'Monthly link saved successfully' });
        } catch (err) {
            console.error('Error saving SKP monthly link:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    renameMonthlyButir: async (req, res) => {
        try {
            const { bidang_id, old_butir_skp, new_butir_skp } = req.body;
            if (!bidang_id || !old_butir_skp || !new_butir_skp) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            await pool.query(`
                UPDATE skp_monthly_links 
                SET butir_skp = ? 
                WHERE bidang_id = ? AND butir_skp = ?
            `, [new_butir_skp.trim(), bidang_id, old_butir_skp.trim()]);

            res.json({ success: true, message: 'Butir SKP renamed successfully in database' });
        } catch (err) {
            console.error('Error renaming SKP monthly butir:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getParirimbonLinks: async (req, res) => {
        try {
            const { bidang_id } = req.query;
            if (!bidang_id) {
                return res.status(400).json({ success: false, message: 'bidang_id is required' });
            }
            const [rows] = await pool.query(`
                SELECT tahun, bidang_id, is_contoh, link_url, updated_at
                FROM skp_paririmbon_links
                WHERE bidang_id = ?
            `, [bidang_id]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching paririmbon links:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    saveParirimbonLink: async (req, res) => {
        try {
            const { tahun, bidang_id, is_contoh, link_url, updated_by } = req.body;
            if (bidang_id === undefined || bidang_id === null) {
                return res.status(400).json({ success: false, message: 'bidang_id is required' });
            }
            if (!link_url) {
                return res.status(400).json({ success: false, message: 'link_url is required' });
            }
            const isContohVal = is_contoh ? 1 : 0;
            const tahunVal = isContohVal ? 0 : (tahun || 0);
            await pool.query(`
                INSERT INTO skp_paririmbon_links (tahun, bidang_id, is_contoh, link_url, updated_by)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE link_url = VALUES(link_url), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP
            `, [tahunVal, bidang_id, isContohVal, link_url, updated_by || null]);
            res.json({ success: true, message: 'Paririmbon link saved successfully' });
        } catch (err) {
            console.error('Error saving paririmbon link:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getPublicDocumentsByCell: async (req, res) => {
        try {
            const { year, bidang_id, month, butir_skp } = req.query;
            if (!year || !bidang_id || !month || !butir_skp) {
                return res.status(400).json({ success: false, message: 'Missing required query parameters: year, bidang_id, month, butir_skp' });
            }

            const [rows] = await pool.query(`
                SELECT 
                    pp.id as pegawai_id,
                    pp.nama_lengkap,
                    j.jabatan as jabatan,
                    s.doc_name,
                    s.doc_id,
                    d.path as doc_path,
                    d.is_private,
                    d.uploaded_by,
                    s.updated_at
                FROM profil_pegawai pp
                LEFT JOIN skp_pegawai_docs s ON s.pegawai_id = pp.id 
                    AND s.tahun = ? 
                    AND s.kategori = 'pendukung'
                    AND s.bulan = ?
                    AND s.butir_skp = ?
                LEFT JOIN dokumen_upload d ON s.doc_id = d.id
                LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                WHERE pp.bidang_id = ? 
                  AND pp.is_active = 1
                  AND (jp.nama = 'PNS' OR jp.nama = 'PPPK Penuh Waktu')
                ORDER BY 
                    CASE 
                        WHEN j.jabatan IN ('Bupati', 'Wakil Bupati', 'Sekretaris Daerah', 'Kepala', 'Direktur') OR j.jabatan LIKE 'Kepala Badan%' THEN 1
                        WHEN j.jabatan LIKE 'Sekretaris%' OR j.jabatan = 'Wakil Direktur' THEN 2
                        WHEN j.jabatan LIKE 'Kepala Bidang%' OR j.jabatan LIKE 'Kepala Bagian%' THEN 3
                        WHEN j.jabatan LIKE 'Kepala Sub Bagian%' OR j.jabatan LIKE 'Kepala Seksi%' OR j.jabatan LIKE 'Ketua Tim%' THEN 4
                        ELSE 5
                    END ASC,
                    pp.nama_lengkap ASC
            `, [year, month, butir_skp, bidang_id]);

            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching public documents for cell:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getHistory: async (req, res) => {
        try {
            const { tahun, bidang_id, debug } = req.query;
            console.log('--- GET HISTORY ENDPOINT HIT ---', { tahun, bidang_id, debug });

            if (debug === 'true') {
                const [allRows] = await pool.query(`
                    SELECT h.*, COALESCE(pp.nama_lengkap, u.username, 'Sistem') AS user_nama, p.nama AS pegawai_nama
                    FROM skp_edit_history h
                    LEFT JOIN users u ON h.user_id = u.id
                    LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                    LEFT JOIN profil_pegawai p ON h.pegawai_id = p.id
                    ORDER BY h.id DESC
                    LIMIT 100
                `);
                console.log(`Debug all history found: ${allRows.length} records`);
                return res.json({ success: true, data: allRows });
            }

            if (!tahun || !bidang_id) {
                return res.status(400).json({ success: false, message: 'Missing tahun or bidang_id' });
            }

            const [rows] = await pool.query(`
                SELECT h.*, COALESCE(pp.nama_lengkap, u.username, 'Sistem') AS user_nama, p.nama AS pegawai_nama
                FROM skp_edit_history h
                LEFT JOIN users u ON h.user_id = u.id
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN profil_pegawai p ON h.pegawai_id = p.id
                WHERE h.tahun = ? AND h.bidang_id = ?
                ORDER BY h.created_at DESC
                LIMIT 100
            `, [tahun, bidang_id]);

            console.log(`History records fetched: ${rows.length} for tahun=${tahun}, bidang_id=${bidang_id}`);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching SKP history:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = skpController;
