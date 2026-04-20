const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/kegiatan');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for all files
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf', 
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipe file tidak diperbolehkan!'));
        }
    }
}).fields([
    { name: 'surat_undangan_masuk', maxCount: 10 },
    { name: 'surat_undangan_keluar', maxCount: 10 },
    { name: 'bahan_desk', maxCount: 10 },
    { name: 'paparan', maxCount: 10 },
    { name: 'notulensi', maxCount: 10 },
    { name: 'foto', maxCount: 10 },
    { name: 'laporan', maxCount: 10 }
]);

const syncDokumenTematik = async (connection, docIds, tematikIdsRaw, kegiatanId) => {
    if (!docIds || (Array.isArray(docIds) && docIds.length === 0)) return;
    
    const ids = Array.isArray(docIds) ? docIds : [docIds];
    const tags = !tematikIdsRaw ? [] : (Array.isArray(tematikIdsRaw) 
        ? tematikIdsRaw 
        : String(tematikIdsRaw).split(',').map(s => s.trim()).filter(Boolean));

    for (const dId of ids) {
        // 1. Mirror to global (kegiatan_id = 0) ONLY IF it doesn't have any global tags yet 
        // This satisfies "tematik yang tersimpan adalah pertama kali dia diupload"
        const [globalExist] = await connection.query('SELECT 1 FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = 0 LIMIT 1', [dId]);
        if (globalExist.length === 0 && tags.length > 0) {
            for (const tId of tags) {
                await connection.query('INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, 0)', [dId, tId]);
            }
        }

        // 2. Sync for THIS specific activity
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = ?', [dId, kegiatanId]);
        for (const tId of tags) {
            await connection.query('INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, ?)', [dId, tId, kegiatanId]);
        }
    }
};

const syncToKegiatanPegawai = async (connection, kegiatanId) => {
    try {
        // 1. Get Global Activity details
        const [kegData] = await connection.query(`
            SELECT k.*, DATE_FORMAT(k.tanggal, '%Y-%m-%d') as tanggal_str, t.kode as tipe_kode 
            FROM kegiatan_manajemen k
            LEFT JOIN master_tipe_kegiatan t ON k.jenis_kegiatan_id = t.id
            WHERE k.id = ?
        `, [kegiatanId]);
        
        if (kegData.length === 0) return;
        const keg = kegData[0];
        const assignedPetugasIds = keg.petugas_ids ? String(keg.petugas_ids).split(',').map(Number).filter(Boolean) : [];

        // 2. Get All Linked Document IDs (comma separated for lampiran_kegiatan)
        const [docRows] = await connection.query('SELECT dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [kegiatanId]);
        const lampiranIds = docRows.map(d => d.dokumen_id).join(',');

        // 3. For each assigned officer, UPSERT into logbook
        for (const pId of assignedPetugasIds) {
            await connection.query(`
                INSERT INTO kegiatan_harian_pegawai (
                    profil_pegawai_id, tanggal, sesi, tipe_kegiatan, 
                    id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan,
                    created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    tanggal = VALUES(tanggal),
                    sesi = VALUES(sesi),
                    tipe_kegiatan = VALUES(tipe_kegiatan),
                    nama_kegiatan = VALUES(nama_kegiatan),
                    lampiran_kegiatan = VALUES(lampiran_kegiatan),
                    keterangan = VALUES(keterangan),
                    updated_by = VALUES(updated_by)
            `, [
                pId, keg.tanggal_str, keg.sesi || 'Pagi', keg.tipe_kode || 'RM',
                kegiatanId, keg.nama_kegiatan, lampiranIds, keg.keterangan || '',
                keg.created_by, keg.created_by
            ]);
        }

        // 4. DELETE logbook entries for officers who are NO LONGER assigned to this activity
        if (assignedPetugasIds.length > 0) {
            await connection.query(`
                DELETE FROM kegiatan_harian_pegawai 
                WHERE id_kegiatan_eksternal = ? 
                AND profil_pegawai_id NOT IN (?)
            `, [kegiatanId, assignedPetugasIds]);
        } else {
            await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [kegiatanId]);
        }

    } catch (err) {
        console.error('Error syncing to logbook:', err);
        throw err;
    }
};

const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

const create = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const {
            tanggal,
            nama_kegiatan,
            tematik_ids,
            jenis_kegiatan_id,
            bidang_ids,
            instansi_penyelenggara,
            petugas_ids,
            kelengkapan,
            tanggal_akhir,
            sesi,
            jenis_dokumen_ids,
            keterangan
        } = req.body;

        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        // Fetch Dynamic Scope
        const [scopeRows] = await connection.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;


        // Access Check
        if (!isGlobal) {
            // Get user's agency name for string comparison
            const [userInstansiRows] = await connection.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
            const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

            // Robust comparison (case-insensitive & trimmed)
            const cleanUserInstansi = userInstansiName.toLowerCase();
            const cleanRequestInstansi = (instansi_penyelenggara || '').trim().toLowerCase();

            console.log(`[Validation Debug] User: "${userInstansiName}" (${userInstansiId}), Req: "${instansi_penyelenggara}", Bidang: ${userBidangId}`);

            if (isInstansiLevel) {
                // Restriction removed based on user request: can pick any agency
            } else if (isBidangLevel) {
                // Restriction removed based on user request: can pick any agency/bidang
            } else {

                return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk membuat kegiatan terpusat.' });
            }
        }




        const jd_ids = jenis_dokumen_ids ? JSON.parse(jenis_dokumen_ids) : {};
        const created_by = req.user ? req.user.id : null;
        let initialDocs = [];

        // Helper to insert into dokumen_upload
        const insertToDokumenUpload = async (file, fieldType) => {
            const nama_file = file.originalname;
            const filePath = '/uploads/kegiatan/' + file.filename;
            const ukuran = file.size;
            const jenis_id = (jd_ids[fieldType] || jd_ids[file.fieldname]) || null;
            const finalJenisId = (jenis_id === "" || jenis_id === "null" || jenis_id === undefined) ? null : jenis_id;

            const [queryResult] = await connection.query(
                `INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [nama_file, filePath, ukuran, finalJenisId, created_by]
            );
            
            const newDocId = queryResult.insertId;

            // Record history
            await connection.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [newDocId, created_by, 'upload', `File diupload melalui modul Isi Kegiatan (${fieldType})`]
            );

            initialDocs.push(`${nama_file} (${fieldType})`);
            return { id: newDocId, path: filePath };
        };

        // Process ALL fields as potentially multiple
        const allFields = ['surat_undangan_masuk', 'surat_undangan_keluar', 'bahan_desk', 'paparan', 'notulensi', 'foto', 'laporan'];
        
        let primaryPaths = {
            surat_undangan_masuk: null,
            surat_undangan_keluar: null,
            bahan_desk: null,
            paparan: null
        };
        let primaryIds = {
            surat_undangan_masuk: null,
            surat_undangan_keluar: null,
            bahan_desk: null,
            paparan: null
        };

        const [result] = await connection.query(
            `INSERT INTO kegiatan_manajemen (
                tanggal, tanggal_akhir, nama_kegiatan, surat_undangan_masuk, surat_undangan_keluar, 
                tematik_ids, bahan_desk, paparan, jenis_kegiatan_id, bidang_ids, 
                instansi_penyelenggara, petugas_ids, kelengkapan, keterangan, created_by,
                surat_undangan_masuk_id, surat_undangan_keluar_id, bahan_desk_id, paparan_id, sesi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tanggal, tanggal_akhir || tanggal, nama_kegiatan, null, null,
                tematik_ids, null, null, jenis_kegiatan_id, bidang_ids,
                instansi_penyelenggara, petugas_ids, kelengkapan, keterangan, created_by,
                null, null, null, null, sesi
            ]
        );

        const kegiatan_id = result.insertId;

        const mappingIds = [];
        // 1. Process New File Uploads
        for (const field of allFields) {
            if (req.files && req.files[field]) {
                for (const [index, file] of req.files[field].entries()) {
                    const info = await insertToDokumenUpload(file, field);
                    
                    if (index === 0 && primaryPaths.hasOwnProperty(field)) {
                        primaryPaths[field] = info.path;
                        primaryIds[field] = info.id;
                    }

                    const [mappingResult] = await connection.query(
                        `INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id)
                         VALUES (?, ?, ?, ?, ?)`,
                        [kegiatan_id, file.originalname, info.path, field, info.id]
                    );
                    mappingIds.push(mappingResult.insertId);
                }
            }
        }

        // 2. Process Selected Library Documents (from Kelola Dokumen)
        const libraryDocInput = req.body.libraryLinks || req.body.selected_library_doc_ids;
        if (libraryDocInput) {
            const libraryDocs = JSON.parse(libraryDocInput); // { field: [ids] }
            for (const field in libraryDocs) {
                const ids = libraryDocs[field];
                for (const docId of ids) {
                    const [docRows] = await connection.query(
                        'SELECT nama_file, path FROM dokumen_upload WHERE id = ?', 
                        [docId]
                    );
                    if (docRows.length > 0) {
                        const { nama_file, path } = docRows[0];
                        
                        // If it's a primary field and we don't have a path yet (new upload takes priority), set it
                        if (primaryPaths.hasOwnProperty(field) && !primaryPaths[field]) {
                            primaryPaths[field] = path;
                            primaryIds[field] = docId;
                        }

                        const [mappingResult] = await connection.query(
                            `INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id)
                             VALUES (?, ?, ?, ?, ?)`,
                            [kegiatan_id, nama_file, path, field, docId]
                        );
                        mappingIds.push(mappingResult.insertId);
                        initialDocs.push(`${nama_file} (${field} - Library)`);
                    }
                }
            }
        }

        // No need to update mapping records anymore as they have the kegiatan_id from the start

        // --- NEW: Sync Tematik to ALL documents linked in this request ---
        // 1. Get all docIds linked
        const [allRelDocs] = await connection.query('SELECT dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [kegiatan_id]);
        const docIdsToSync = allRelDocs.map(d => d.dokumen_id);
        
        // 2. Perform Sync
        await syncDokumenTematik(connection, docIdsToSync, tematik_ids, kegiatan_id);

        // --- NEW: Sync to Individual Employee Logbook ---
        // Since we moved the primary insert up, we update it now with the final gathered paths and IDs
        await connection.query(
            'UPDATE kegiatan_manajemen SET surat_undangan_masuk = ?, surat_undangan_keluar = ?, bahan_desk = ?, paparan = ?, surat_undangan_masuk_id = ?, surat_undangan_keluar_id = ?, bahan_desk_id = ?, paparan_id = ? WHERE id = ?',
            [
                primaryPaths.surat_undangan_masuk, primaryPaths.surat_undangan_keluar, primaryPaths.bahan_desk, primaryPaths.paparan,
                primaryIds.surat_undangan_masuk, primaryIds.surat_undangan_keluar, primaryIds.bahan_desk, primaryIds.paparan,
                kegiatan_id
            ]
        );

        // --- NEW: Sync to Individual Employee Logbook ---
        await syncToKegiatanPegawai(connection, kegiatan_id);

        // Record history at the end to capture ALL initial documents
        const createNote = initialDocs.length > 0 
            ? `Kegiatan dibuat pertama kali dengan dokumen: ${initialDocs.join(', ')}` 
            : 'Kegiatan dibuat pertama kali';

        await connection.query(
            'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [kegiatan_id, created_by, 'create', createNote]
        );

        await connection.commit();
        res.status(201).json({ success: true, message: 'Kegiatan berhasil disimpan', data: { id: kegiatan_id } });
    } catch (err) {
        await connection.rollback();
        // Cleanup uploaded files on failure
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
        }
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const getAll = async (req, res) => {
    try {
        const { search, startDate, endDate, bidang, tematik, instansi } = req.query;
        let whereConditions = ["k.is_deleted = 0"];
        const params = [];

        if (search) {
            whereConditions.push("k.nama_kegiatan LIKE ?");
            params.push(`%${search}%`);
        }

        if (startDate && endDate) {
            whereConditions.push("k.tanggal BETWEEN ? AND ?");
            params.push(startDate, endDate);
        } else if (startDate) {
            whereConditions.push("k.tanggal >= ?");
            params.push(startDate);
        } else if (endDate) {
            whereConditions.push("k.tanggal <= ?");
            params.push(endDate);
        } else {
            // DEFAULT: Last 6 months
            whereConditions.push("k.tanggal >= DATE_SUB(NOW(), INTERVAL 6 MONTH)");
        }

        if (bidang) {
            whereConditions.push("FIND_IN_SET(?, k.bidang_ids)");
            params.push(bidang);
        }

        if (tematik) {
            whereConditions.push("FIND_IN_SET(?, k.tematik_ids)");
            params.push(tematik);
        }

        if (instansi) {
            whereConditions.push("k.instansi_penyelenggara = ?");
            params.push(instansi);
        }

        const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        const [scopeRows] = await pool.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;
        const isStandardUser = dbScope === 1;

        const [userInstansiRows] = await pool.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
        const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

        const query = `
            SELECT 
                k.*,
                jk.nama as jenis_kegiatan_nama,
                pp_c.bidang_id as creator_bidang_id,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', kd.id, 'nama_file', kd.nama_file, 'path', kd.path, 
                            'tipe_dokumen', kd.tipe_dokumen, 'dokumen_id', kd.dokumen_id,
                            'is_trash', COALESCE(d.is_deleted, 0)
                        )
                    )
                    FROM kegiatan_manajemen_dokumen kd
                    INNER JOIN dokumen_upload d ON kd.dokumen_id = d.id
                    WHERE kd.kegiatan_id = k.id AND d.is_deleted = 0
                ) as dokumen,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', COALESCE(pp_h.nama_lengkap, usr_h.username)
                        )
                    )
                    FROM kegiatan_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai pp_h ON usr_h.profil_pegawai_id = pp_h.id
                    WHERE h.kegiatan_id = k.id
                ) as edit_history
            FROM kegiatan_manajemen k
            LEFT JOIN master_tipe_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            LEFT JOIN users u_c ON k.created_by = u_c.id
            LEFT JOIN profil_pegawai pp_c ON u_c.profil_pegawai_id = pp_c.id
            ${whereClause}
            ORDER BY k.tanggal DESC, k.created_at DESC
        `;
        const [rows] = await pool.query(query, params);
        const data = rows.map(row => {
            let canEdit = false;
            let canDelete = false;

            if (isGlobal) {
                canEdit = true;
                canDelete = true;
            } else if (isInstansiLevel) {
                if ((row.instansi_penyelenggara || '').trim().toLowerCase() === userInstansiName.toLowerCase()) {
                    canEdit = true;
                    canDelete = true;
                }
            } else if (isBidangLevel) {
                const isCreatorBidang = row.creator_bidang_id === userBidangId;
                const isTaggedBidang = String(row.bidang_ids || '').split(',').includes(String(userBidangId));
                
                if (isCreatorBidang || isTaggedBidang) {
                    canEdit = true;
                    canDelete = true;
                }
            } else if (isStandardUser) {
                const petugasIds = String(row.petugas_ids || '').split(',').map(Number);
                if (petugasIds.includes(req.user.profil_pegawai_id)) {
                    canEdit = true;
                }
            }

            return {
                ...row,
                can_edit: canEdit,
                can_delete: canDelete,
                dokumen: typeof row.dokumen === 'string' ? JSON.parse(row.dokumen) : (row.dokumen || []),
                edit_history: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : (row.edit_history || [])
            };
        });
        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                k.*,
                jk.nama as jenis_kegiatan_nama,
                pp_c.bidang_id as creator_bidang_id,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', kd.id, 'nama_file', kd.nama_file, 'path', kd.path, 
                            'tipe_dokumen', kd.tipe_dokumen, 'dokumen_id', kd.dokumen_id,
                            'is_trash', COALESCE(d.is_deleted, 0)
                        )
                    )
                    FROM kegiatan_manajemen_dokumen kd
                    INNER JOIN dokumen_upload d ON kd.dokumen_id = d.id
                    WHERE kd.kegiatan_id = k.id AND d.is_deleted = 0
                ) as dokumen,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', COALESCE(pp_h.nama_lengkap, usr_h.username)
                        )
                    )
                    FROM kegiatan_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai pp_h ON usr_h.profil_pegawai_id = pp_h.id
                    WHERE h.kegiatan_id = k.id
                ) as edit_history
            FROM kegiatan_manajemen k
            LEFT JOIN master_tipe_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            LEFT JOIN users u_c ON k.created_by = u_c.id
            LEFT JOIN profil_pegawai pp_c ON u_c.profil_pegawai_id = pp_c.id
            WHERE k.id = ? AND k.is_deleted = 0
        `;
        const [rows] = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        
        const data = {
            ...rows[0],
            dokumen: typeof rows[0].dokumen === 'string' ? JSON.parse(rows[0].dokumen) : (rows[0].dokumen || []),
            edit_history: typeof rows[0].edit_history === 'string' ? JSON.parse(rows[0].edit_history) : (rows[0].edit_history || [])
        };
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const update = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const {
            tanggal,
            nama_kegiatan,
            tematik_ids,
            jenis_kegiatan_id,
            bidang_ids,
            instansi_penyelenggara,
            petugas_ids,
            kelengkapan,
            tanggal_akhir,
            sesi,
            removed_dokumen_ids,
            jenis_dokumen_ids,
            keterangan
        } = req.body;

        const jd_ids = jenis_dokumen_ids ? JSON.parse(jenis_dokumen_ids) : {};
        const updated_by = req.user ? req.user.id : null;

        const [oldRows] = await connection.query('SELECT *, DATE_FORMAT(tanggal, "%Y-%m-%d") as tanggal_format, DATE_FORMAT(tanggal_akhir, "%Y-%m-%d") as tanggal_akhir_format FROM kegiatan_manajemen WHERE id = ?', [id]);
        if (oldRows.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        const oldData = oldRows[0];

        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        // Fetch Dynamic Scope
        const [scopeRows] = await connection.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;
        const isStandardUser = dbScope === 1;


        // Access Check
        let hasEditAccess = false;
        let isUploadOnly = false;

        if (isGlobal) {
            hasEditAccess = true;
        } else {
            // Get user's agency name for string comparison with free-text field
            const [userInstansiRows] = await connection.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
            const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

            // Robust comparison (case-insensitive & trimmed)
            const cleanUserInstansi = userInstansiName.toLowerCase();
            const cleanOldInstansi = (oldData.instansi_penyelenggara || '').trim().toLowerCase();

            console.log(`[Update Debug] User: "${userInstansiName}", Old: "${oldData.instansi_penyelenggara}", Bidang: ${userBidangId}`);

            if (isInstansiLevel) {
                if (cleanOldInstansi === cleanUserInstansi) hasEditAccess = true;
            } else if (isBidangLevel) {
                const [creatorRows] = await connection.query(`
                    SELECT pp.bidang_id 
                    FROM users u 
                    JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                    WHERE u.id = ?`, [oldData.created_by]);
                const creatorBidangId = creatorRows.length > 0 ? creatorRows[0].bidang_id : null;
                const oldBidangIdsArr = String(oldData.bidang_ids || '').split(',').map(Number);

                if (creatorBidangId === userBidangId || oldBidangIdsArr.includes(userBidangId)) {
                    hasEditAccess = true;
                }
            } else if (isStandardUser) {

                const petugasIds = String(oldData.petugas_ids || '').split(',').map(Number);
                if (petugasIds.includes(req.user.profil_pegawai_id)) {
                    hasEditAccess = true;
                    isUploadOnly = true;
                }
            }
        }



        if (!hasEditAccess) {
             return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk mengedit kegiatan ini.' });
        }


        if (isUploadOnly) {
             const oldTanggalFormat = oldData.tanggal_format;
             
             // Robust date normalization: extract YYYY-MM-DD from ISO strings or use as-is
             const normalizedTanggal = (tanggal && typeof tanggal === 'string' && tanggal.includes('T'))
                 ? tanggal.split('T')[0]
                 : tanggal;
             
             if ((oldData.nama_kegiatan || '').trim() !== (nama_kegiatan || '').trim() || 
                 oldTanggalFormat !== normalizedTanggal || 
                 Number(oldData.jenis_kegiatan_id) !== Number(jenis_kegiatan_id) ||
                 (oldData.sesi || '').trim() !== (sesi || '').trim()) {
                  return res.status(403).json({ success: false, message: 'Sebagai petugas, Anda hanya diperbolehkan mengedit lampiran, tematik, dan tambahan keterangan pada kegiatan ini.' });
             }
        }

        let changes = [];


        // Helper to insert into dokumen_upload
        const insertToDokumenUpload = async (file, fieldType) => {
            const nama_file = file.originalname;
            const filePath = '/uploads/kegiatan/' + file.filename;
            const ukuran = file.size;
            const jenis_id = (jd_ids[fieldType] || jd_ids[file.fieldname]) || null;
            const finalJenisId = (jenis_id === "" || jenis_id === "null" || jenis_id === undefined) ? null : jenis_id;

            const [queryResult] = await connection.query(
                `INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [nama_file, filePath, ukuran, finalJenisId, updated_by]
            );
            
            const newDocId = queryResult.insertId;

            await connection.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [newDocId, updated_by, 'upload', `File diupload melalui modul Isi Kegiatan (${fieldType}) - Update`]
            );

            changes.push(`Menambah dokumen baru (${fieldType}): "${nama_file}"`);
            return { id: newDocId, path: filePath };
        };

        const deleteOldDokumen = async (docId) => {
            if (!docId) return;
            const [rows] = await connection.query('SELECT path FROM dokumen_upload WHERE id = ?', [docId]);
            if (rows.length > 0) {
                const absPath = path.join(__dirname, '../..', rows[0].path);
                if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
            }
            await connection.query('DELETE FROM dokumen_upload WHERE id = ?', [docId]);
        };

        // Process ALL fields as potentially multiple
        const allFields = ['surat_undangan_masuk', 'surat_undangan_keluar', 'bahan_desk', 'paparan', 'notulensi', 'foto', 'laporan'];
        let updatedPrimary = {
            surat_undangan_masuk: oldData.surat_undangan_masuk,
            surat_undangan_keluar: oldData.surat_undangan_keluar,
            bahan_desk: oldData.bahan_desk,
            paparan: oldData.paparan,
            surat_undangan_masuk_id: oldData.surat_undangan_masuk_id,
            surat_undangan_keluar_id: oldData.surat_undangan_keluar_id,
            bahan_desk_id: oldData.bahan_desk_id,
            paparan_id: oldData.paparan_id
        };

        for (const field of allFields) {
            if (req.files && req.files[field]) {
                for (const [index, file] of req.files[field].entries()) {
                    const info = await insertToDokumenUpload(file, field);
                    
                    // If it's one of the primary fields and the FIRST new file, update primary info
                    if (index === 0 && updatedPrimary.hasOwnProperty(field)) {
                        updatedPrimary[field] = info.path;
                        updatedPrimary[field + '_id'] = info.id;
                    }

                    // Always save to mapping table
                    await connection.query(
                        `INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id)
                         VALUES (?, ?, ?, ?, ?)`,
                        [id, file.originalname, info.path, field, info.id]
                    );
                }
            }
        }

        // 2. Process Selected Library Documents (from Kelola Dokumen)
        const libraryDocInput = req.body.libraryLinks || req.body.selected_library_doc_ids;
        if (libraryDocInput) {
            const libraryDocs = JSON.parse(libraryDocInput); // { field: [ids] }
            for (const field in libraryDocs) {
                const ids = libraryDocs[field];
                for (const docId of ids) {
                    const [docRows] = await connection.query(
                        'SELECT nama_file, path FROM dokumen_upload WHERE id = ?', 
                        [docId]
                    );
                    if (docRows.length > 0) {
                        const { nama_file, path } = docRows[0];
                        
                        // If it's a primary field and we don't have a path yet (new upload taking priority), set it
                        if (updatedPrimary.hasOwnProperty(field) && !updatedPrimary[field]) {
                            updatedPrimary[field] = path;
                            updatedPrimary[field + '_id'] = docId;
                        }

                        await connection.query(
                            `INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id)
                             VALUES (?, ?, ?, ?, ?)`,
                            [id, nama_file, path, field, docId]
                        );
                        changes.push(`Menambah dokumen dari perpustakaan (${field}): "${nama_file}"`);
                    }
                }
            }
        }

        // 3. Handle removed/trashed/unlinked documents
        const trashIds = req.body.docs_to_trash ? String(req.body.docs_to_trash).split(',').map(Number) : [];
        const unlinkIds = req.body.docs_to_unlink ? String(req.body.docs_to_unlink).split(',').map(Number) : [];

        // TRASH: Soft delete in global dokumen_upload and remove relationships
        for (const docId of trashIds) {
            // Update global status
            await connection.query('UPDATE dokumen_upload SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [docId]);
            
            // Record history (Important for Trash menu to be consistent)
            await connection.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [docId, updated_by, 'delete', `Dokumen dipindahkan ke tempat sampah melalui modul Isi Kegiatan oleh ${req.user.nama_lengkap || 'User'}`]
            );

            // Find all relationships to remove primary slots if needed
            const [relRows] = await connection.query('SELECT kegiatan_id, tipe_dokumen, nama_file FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?', [docId]);
            for (const rel of relRows) {
                if (rel.kegiatan_id === parseInt(id)) {
                    changes.push(`Membuang dokumen ke tempat sampah (${rel.tipe_dokumen}): "${rel.nama_file}"`);
                    if (updatedPrimary[rel.tipe_dokumen + '_id'] === docId) {
                        updatedPrimary[rel.tipe_dokumen] = null;
                        updatedPrimary[rel.tipe_dokumen + '_id'] = null;
                    }
                }
            }
            // Remove activity-document links
            await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ? AND kegiatan_id = ?', [docId, id]);

            // --- NEW: Remove activity-derived thematic tags AND global tags ---
            await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND (kegiatan_id = ? OR kegiatan_id = 0)', [docId, id]);
        }

        // UNLINK: Just remove from this activity
        for (const relId of unlinkIds) {
            const [relRows] = await connection.query('SELECT dokumen_id, tipe_dokumen, nama_file FROM kegiatan_manajemen_dokumen WHERE id = ?', [relId]);
            if (relRows.length > 0) {
                const { dokumen_id, tipe_dokumen, nama_file } = relRows[0];
                changes.push(`Menghapus tautan dokumen (${tipe_dokumen}): "${nama_file}"`);
                if (updatedPrimary[tipe_dokumen + '_id'] === dokumen_id) {
                    updatedPrimary[tipe_dokumen] = null;
                    updatedPrimary[tipe_dokumen + '_id'] = null;
                }
                // --- NEW: Remove activity-derived thematic tags AND global tags ---
                await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND (kegiatan_id = ? OR kegiatan_id = 0)', [dokumen_id, id]);

                await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE id = ?', [relId]);
            }
        }

        // Try to fill empty primary slots if other docs of same type exist
        for (const field of allFields) {
            if (updatedPrimary.hasOwnProperty(field) && !updatedPrimary[field]) {
                const [nextDocs] = await connection.query(
                    'SELECT path, dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ? AND tipe_dokumen = ? LIMIT 1',
                    [id, field]
                );
                if (nextDocs.length > 0) {
                    updatedPrimary[field] = nextDocs[0].path;
                    updatedPrimary[field + '_id'] = nextDocs[0].dokumen_id;
                }
            }
        }

        await connection.query(
            `UPDATE kegiatan_manajemen SET 
                tanggal = ?, tanggal_akhir = ?, nama_kegiatan = ?, 
                jenis_kegiatan_id = ?, bidang_ids = ?, instansi_penyelenggara = ?, 
                kelengkapan = ?, keterangan = ?, tematik_ids = ?, petugas_ids = ?, sesi = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP,
                surat_undangan_masuk = ?,
                surat_undangan_keluar = ?,
                bahan_desk = ?,
                paparan = ?,
                surat_undangan_masuk_id = ?,
                surat_undangan_keluar_id = ?,
                bahan_desk_id = ?,
                paparan_id = ?
            WHERE id = ?`,
            [
                tanggal, tanggal_akhir || tanggal, nama_kegiatan, 
                jenis_kegiatan_id, bidang_ids, instansi_penyelenggara, 
                kelengkapan, keterangan, tematik_ids, petugas_ids, sesi, updated_by,
                updatedPrimary.surat_undangan_masuk, updatedPrimary.surat_undangan_keluar, updatedPrimary.bahan_desk, updatedPrimary.paparan,
                updatedPrimary.surat_undangan_masuk_id, updatedPrimary.surat_undangan_keluar_id, updatedPrimary.bahan_desk_id, updatedPrimary.paparan_id,
                id
            ]
        );

        // Record history for changes
        if (oldData.nama_kegiatan !== nama_kegiatan) changes.push(`Nama kegiatan diubah: "${oldData.nama_kegiatan}" -> "${nama_kegiatan}"`);
        if (oldData.tanggal_format !== tanggal) changes.push(`Tanggal diubah: "${oldData.tanggal_format}" -> "${tanggal}"`);
        if (oldData.tanggal_akhir_format !== (tanggal_akhir || tanggal)) changes.push(`Tanggal akhir diubah: "${oldData.tanggal_akhir_format}" -> "${tanggal_akhir || tanggal}"`);
        if (oldData.sesi !== sesi) changes.push(`Sesi diubah: "${oldData.sesi || 'N/A'}" -> "${sesi || 'N/A'}"`);
        if (oldData.instansi_penyelenggara !== instansi_penyelenggara) changes.push(`Instansi penyelenggara diubah: "${oldData.instansi_penyelenggara || 'N/A'}" -> "${instansi_penyelenggara || 'N/A'}"`);
        if (oldData.kelengkapan !== kelengkapan) changes.push(`Kelengkapan diubah: "${oldData.kelengkapan || 'N/A'}" -> "${kelengkapan || 'N/A'}"`);
        if (oldData.keterangan !== keterangan) changes.push(`Keterangan diperbarui`);
        
        // Multi-ID fields comparison
        const compareIds = (oldStr, newStr, label) => {
            const oldArr = String(oldStr || '').split(',').map(s => s.trim()).filter(Boolean).sort();
            const newArr = String(newStr || '').split(',').map(s => s.trim()).filter(Boolean).sort();
            if (oldArr.join(',') !== newArr.join(',')) {
                changes.push(`${label} diperbarui`);
            }
        };

        compareIds(oldData.petugas_ids, petugas_ids, 'Daftar Petugas');
        compareIds(oldData.tematik_ids, tematik_ids, 'Tema Tematik');
        compareIds(oldData.bidang_ids, bidang_ids, 'Daftar Bidang');
        
        if (changes.length > 0) {
            await connection.query(
                'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [id, updated_by, 'edit', changes.join(', ')]
            );
        }

        // --- NEW: Sync Tematik to ALL current documents of this activity ---
        // This ensures that if the activity's theme is changed, all its documents are updated.
        const [allDocs] = await connection.query('SELECT dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [id]);
        const currentDocIds = allDocs.map(d => d.dokumen_id);
        await syncDokumenTematik(connection, currentDocIds, tematik_ids, id);

        // --- NEW: Sync to Individual Employee Logbook ---
        await syncToKegiatanPegawai(connection, id);

        await connection.commit();
        res.json({ success: true, message: 'Kegiatan berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const remove = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [kegiatan] = await connection.query('SELECT * FROM kegiatan_manajemen WHERE id = ?', [id]);
        if (kegiatan.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        const oldData = kegiatan[0];

        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        // Fetch Dynamic Scope
        const [scopeRows] = await connection.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;


        // Access Check
        let hasDeleteAccess = false;
        if (isGlobal) {
            hasDeleteAccess = true;
        } else {
            // Get user's agency name for string comparison with free-text field
            const [userInstansiRows] = await connection.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
            const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

            // Robust comparison
            const cleanUserInstansi = userInstansiName.toLowerCase();
            const cleanOldInstansi = (oldData.instansi_penyelenggara || '').trim().toLowerCase();

            if (isInstansiLevel) {
                if (cleanOldInstansi === cleanUserInstansi) hasDeleteAccess = true;
            } else if (isBidangLevel) {
                const [creatorRows] = await connection.query(`
                    SELECT pp.bidang_id 
                    FROM users u 
                    JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                    WHERE u.id = ?`, [oldData.created_by]);
                const creatorBidangId = creatorRows.length > 0 ? creatorRows[0].bidang_id : null;
                const oldBidangIdsArr = String(oldData.bidang_ids || '').split(',').map(Number);

                if (creatorBidangId === userBidangId || oldBidangIdsArr.includes(userBidangId)) {
                    hasDeleteAccess = true;
                }
            }

        }




        if (!hasDeleteAccess) {
             return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk menghapus kegiatan ini.' });
        }


        // SOFT DELETE
        await connection.query('UPDATE kegiatan_manajemen SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [id]);

        // Record history
        await connection.query(
            'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [id, req.user.id, 'delete', `Kegiatan dipindahkan ke tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
        );

        // Remove from Individual Employee Logbook (so it's not visible while in trash)
        await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [id]);

        await connection.commit();
        res.json({ success: true, message: 'Kegiatan dipindahkan ke tempat sampah' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const getTrash = async (req, res) => {
    try {
        // --- AUTO PURGE OLD TRASH (Older than 30 days) ---
        // 1. First, ensure a global (library) version of these tags exists
        await pool.query(`
            INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id)
            SELECT dt.dokumen_id, dt.tematik_id, 0
            FROM dokumen_tematik dt
            JOIN kegiatan_manajemen k ON dt.kegiatan_id = k.id
            WHERE k.is_deleted = 1 AND k.deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        // 2. Then remove the activity-specific associations
        await pool.query(`
            DELETE dt FROM dokumen_tematik dt
            JOIN kegiatan_manajemen k ON dt.kegiatan_id = k.id
            WHERE k.is_deleted = 1 AND k.deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        // Then purge the activities and their links
        const [oldTrash] = await pool.query('SELECT id FROM kegiatan_manajemen WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
        for (const t of oldTrash) {
            await pool.query('DELETE FROM kegiatan_edit_history WHERE kegiatan_id = ?', [t.id]);
            await pool.query('DELETE FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [t.id]);
            await pool.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [t.id]);
        }

        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        const [scopeRows] = await pool.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;
        const isStandardUser = dbScope === 1;

        const [userInstansiRows] = await pool.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
        const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

        const query = `
            SELECT 
                k.*,
                jk.nama as jenis_kegiatan_nama,
                pp_c.bidang_id as creator_bidang_id,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', kd.id, 'nama_file', kd.nama_file, 'path', kd.path, 
                            'tipe_dokumen', kd.tipe_dokumen, 'dokumen_id', kd.dokumen_id,
                            'is_trash', COALESCE(d.is_deleted, 0)
                        )
                    )
                    FROM kegiatan_manajemen_dokumen kd
                    INNER JOIN dokumen_upload d ON kd.dokumen_id = d.id
                    WHERE kd.kegiatan_id = k.id AND d.is_deleted = 0
                ) as dokumen,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', COALESCE(pp_h.nama_lengkap, usr_h.username)
                        )
                    )
                    FROM kegiatan_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai pp_h ON usr_h.profil_pegawai_id = pp_h.id
                    WHERE h.kegiatan_id = k.id
                ) as edit_history
            FROM kegiatan_manajemen k
            LEFT JOIN master_tipe_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            LEFT JOIN users u_c ON k.created_by = u_c.id
            LEFT JOIN profil_pegawai pp_c ON u_c.profil_pegawai_id = pp_c.id
            WHERE k.is_deleted = 1 AND k.deleted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY k.deleted_at DESC
        `;
        const [rows] = await pool.query(query);
        const data = rows.map(row => {
            let canEdit = false;
            let canDelete = false;

            if (isGlobal) {
                canEdit = true;
                canDelete = true;
            } else if (isInstansiLevel) {
                if ((row.instansi_penyelenggara || '').trim().toLowerCase() === userInstansiName.toLowerCase()) {
                    canEdit = true;
                    canDelete = true;
                }
            } else if (isBidangLevel) {
                const isCreatorBidang = row.creator_bidang_id === userBidangId;
                const isTaggedBidang = String(row.bidang_ids || '').split(',').includes(String(userBidangId));
                
                if (isCreatorBidang || isTaggedBidang) {
                    canEdit = true;
                    canDelete = true;
                }
            } else if (isStandardUser) {
                const petugasIds = String(row.petugas_ids || '').split(',').map(Number);
                if (petugasIds.includes(req.user.profil_pegawai_id)) {
                    canEdit = true;
                }
            }

            return {
                ...row,
                can_edit: canEdit,
                can_delete: canDelete,
                dokumen: typeof row.dokumen === 'string' ? JSON.parse(row.dokumen) : (row.dokumen || []),
                edit_history: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : (row.edit_history || [])
            };
        });
        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const restore = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [rows] = await connection.query('SELECT *, DATE_FORMAT(tanggal, "%Y-%m-%d") as tanggal_format FROM kegiatan_manajemen WHERE id = ? AND is_deleted = 1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan di tempat sampah' });
        }
        const oldData = rows[0];

        // Access Check
        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        const [scopeRows] = await connection.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;

        let hasAccess = false;
        if (isGlobal) {
            hasAccess = true;
        } else {
            // Get user's agency name for string comparison with free-text field
            const [userInstansiRows] = await connection.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
            const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

            // Robust comparison
            const cleanUserInstansi = userInstansiName.toLowerCase();
            const cleanOldInstansi = (oldData.instansi_penyelenggara || '').trim().toLowerCase();

            if (isInstansiLevel) {
                if (cleanOldInstansi === cleanUserInstansi) hasAccess = true;
            } else if (isBidangLevel) {
                const [creatorRows] = await connection.query(`
                    SELECT pp.bidang_id 
                    FROM users u 
                    JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                    WHERE u.id = ?`, [oldData.created_by]);
                const creatorBidangId = creatorRows.length > 0 ? creatorRows[0].bidang_id : null;
                const oldBidangIdsArr = String(oldData.bidang_ids || '').split(',').map(Number);

                if (creatorBidangId === userBidangId || oldBidangIdsArr.includes(userBidangId)) {
                    hasAccess = true;
                }
            }

        }



        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk memulihkan kegiatan ini.' });
        }

        await connection.query('UPDATE kegiatan_manajemen SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);

        // Record history
        await connection.query(
            'INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [id, req.user.id, 'restore', `Kegiatan dipulihkan dari tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
        );

        // Re-sync to logbooks
        await syncToKegiatanPegawai(connection, id);

        await connection.commit();
        res.json({ success: true, message: 'Kegiatan berhasil dipulihkan' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const permanentDelete = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [kegiatan] = await connection.query('SELECT * FROM kegiatan_manajemen WHERE id = ? AND is_deleted = 1', [id]);
        if (kegiatan.length === 0) return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan di tempat sampah' });
        const oldData = kegiatan[0];

        // Access Check
        const userTipe = req.user.tipe_user_id;
        const userJabatan = req.user.jabatan_nama || '';
        const userInstansiId = req.user.instansi_id;
        const userBidangId = req.user.bidang_id;

        const [scopeRows] = await connection.query('SELECT scope FROM role_kegiatan_scope WHERE role_id = ?', [userTipe]);
        const dbScope = scopeRows.length > 0 ? scopeRows[0].scope : 0;

        const isGlobal = dbScope === 4;
        const isInstansiLevel = dbScope === 3 || userJabatan.toLowerCase().includes('sekretaris');
        const isBidangLevel = dbScope === 2;

        let hasAccess = false;
        if (isGlobal) {
            hasAccess = true;
        } else {
            // Get user's agency name for string comparison with free-text field
            const [userInstansiRows] = await connection.query('SELECT TRIM(instansi) as instansi FROM master_instansi_daerah WHERE id = ?', [userInstansiId]);
            const userInstansiName = userInstansiRows.length > 0 ? (userInstansiRows[0].instansi || '').trim() : '';

            // Robust comparison
            const cleanUserInstansi = userInstansiName.toLowerCase();
            const cleanOldInstansi = (oldData.instansi_penyelenggara || '').trim().toLowerCase();

            if (isInstansiLevel) {
                if (cleanOldInstansi === cleanUserInstansi) hasAccess = true;
            } else if (isBidangLevel) {
                const [creatorRows] = await connection.query(`
                    SELECT pp.bidang_id 
                    FROM users u 
                    JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                    WHERE u.id = ?`, [oldData.created_by]);
                const creatorBidangId = creatorRows.length > 0 ? creatorRows[0].bidang_id : null;
                const oldBidangIdsArr = String(oldData.bidang_ids || '').split(',').map(Number);

                if (creatorBidangId === userBidangId || oldBidangIdsArr.includes(userBidangId)) {
                    hasAccess = true;
                }
            }

        }



        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk menghapus kegiatan ini secara permanen.' });
        }

        // Ensure tags are preserved in library (kegiatan_id = 0)
        await connection.query(`
            INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id)
            SELECT dokumen_id, tematik_id, 0
            FROM dokumen_tematik
            WHERE kegiatan_id = ?
        `, [id]);
        
        // Remove activity-specific association
        await connection.query('DELETE FROM dokumen_tematik WHERE kegiatan_id = ?', [id]);

        // Delete from tables (Files are NOT deleted from disk or dokumen_upload as per new policy)
        await connection.query('DELETE FROM kegiatan_edit_history WHERE kegiatan_id = ?', [id]);
        await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [id]);
        await connection.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [id]);

        await connection.commit();
        res.json({ success: true, message: 'Kegiatan dihapus secara permanen' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const emptyTrash = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const [trashed] = await connection.query('SELECT id FROM kegiatan_manajemen WHERE is_deleted = 1');
        if (trashed.length === 0) {
            return res.json({ success: true, message: 'Tempat sampah sudah kosong' });
        }

        for (const t of trashed) {
            // Ensure tags are preserved in library (kegiatan_id = 0)
            await connection.query(`
                INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id)
                SELECT dokumen_id, tematik_id, 0
                FROM dokumen_tematik
                WHERE kegiatan_id = ?
            `, [t.id]);
            
            // Remove activity-specific association
            await connection.query('DELETE FROM dokumen_tematik WHERE kegiatan_id = ?', [t.id]);

            // Delete from tables (Files are kept in library)
            await connection.query('DELETE FROM kegiatan_edit_history WHERE kegiatan_id = ?', [t.id]);
            await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [t.id]);
            await connection.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [t.id]);
        }

        await connection.commit();
        res.json({ success: true, message: `${trashed.length} kegiatan berhasil dihapus permanen` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const checkAvailability = async (req, res) => {
    try {
        const { tanggal, sesi, exclude_id } = req.query;
        if (!tanggal || !sesi) {
            return res.status(400).json({ success: false, message: 'Tanggal dan Sesi wajib diisi' });
        }

        let query = `
            SELECT khp.profil_pegawai_id, khp.tipe_kegiatan, khp.nama_kegiatan, khp.sesi, mtk.nama as tipe_nama 
            FROM kegiatan_harian_pegawai khp
            LEFT JOIN master_tipe_kegiatan mtk ON khp.tipe_kegiatan = mtk.kode
            WHERE khp.tanggal = ?
            AND (
                mtk.nama IN ('Cuti', 'Sakit', 'Dinas Luar', 'DL Luar Bidang')
                OR ? = 'Full Day'
                OR khp.sesi = ?
            )
        `;
        const params = [tanggal, sesi, sesi];

        if (exclude_id) {
            query += " AND (khp.id_kegiatan_eksternal IS NULL OR khp.id_kegiatan_eksternal != ?)";
            params.push(exclude_id);
        }

        const [rows] = await pool.query(query, params);
        
        // Map by officer ID for easy lookup
        const availabilityMap = {};
        rows.forEach(row => {
            if (!availabilityMap[row.profil_pegawai_id]) {
                availabilityMap[row.profil_pegawai_id] = [];
            }
            availabilityMap[row.profil_pegawai_id].push({
                tipe: row.tipe_kegiatan,
                tipe_nama: row.tipe_nama,
                nama: row.nama_kegiatan,
                sesi: row.sesi
            });
        });

        res.json({ success: true, data: availabilityMap });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { 
    uploadMiddleware, 
    create, 
    getAll, 
    getById, 
    update, 
    remove,
    getTrash,
    restore,
    permanentDelete,
    emptyTrash,
    checkAvailability
};
