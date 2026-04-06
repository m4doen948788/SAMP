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
        // Delete only for THIS specific activity source
        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = ?', [dId, kegiatanId]);
        
        // Add new tags for this activity
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
                    id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, 
                    created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    tanggal = VALUES(tanggal),
                    sesi = VALUES(sesi),
                    tipe_kegiatan = VALUES(tipe_kegiatan),
                    nama_kegiatan = VALUES(nama_kegiatan),
                    lampiran_kegiatan = VALUES(lampiran_kegiatan),
                    updated_by = VALUES(updated_by)
            `, [
                pId, keg.tanggal_str, keg.sesi || 'Pagi', keg.tipe_kode || 'RM',
                kegiatanId, keg.nama_kegiatan, lampiranIds,
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
            jenis_dokumen_ids
        } = req.body;

        const jd_ids = jenis_dokumen_ids ? JSON.parse(jenis_dokumen_ids) : {};
        const created_by = req.user ? req.user.id : null;

        // Helper to insert into dokumen_upload
        const insertToDokumenUpload = async (file, fieldType) => {
            const nama_file = file.originalname;
            const filePath = '/uploads/kegiatan/' + file.filename;
            const ukuran = file.size;
            const jenis_id = jd_ids[fieldType] || jd_ids[file.fieldname] || null;

            const [queryResult] = await connection.query(
                `INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [nama_file, filePath, ukuran, jenis_id, created_by]
            );
            
            const newDocId = queryResult.insertId;

            // Record history
            await connection.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [newDocId, created_by, 'upload', `File diupload melalui modul Isi Kegiatan (${fieldType})`]
            );

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
                        [null, file.originalname, info.path, field, info.id]
                    );
                    mappingIds.push(mappingResult.insertId);
                }
            }
        }

        // 2. Process Selected Library Documents (from Kelola Dokumen)
        if (req.body.selected_library_doc_ids) {
            const libraryDocs = JSON.parse(req.body.selected_library_doc_ids); // { field: [ids] }
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
                            [null, nama_file, path, field, docId]
                        );
                        mappingIds.push(mappingResult.insertId);
                    }
                }
            }
        }

        const [result] = await connection.query(
            `INSERT INTO kegiatan_manajemen (
                tanggal, tanggal_akhir, nama_kegiatan, surat_undangan_masuk, surat_undangan_keluar, 
                tematik_ids, bahan_desk, paparan, jenis_kegiatan_id, bidang_ids, 
                instansi_penyelenggara, petugas_ids, kelengkapan, created_by,
                surat_undangan_masuk_id, surat_undangan_keluar_id, bahan_desk_id, paparan_id, sesi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tanggal, tanggal_akhir || tanggal, nama_kegiatan, primaryPaths.surat_undangan_masuk, primaryPaths.surat_undangan_keluar,
                tematik_ids, primaryPaths.bahan_desk, primaryPaths.paparan, jenis_kegiatan_id, bidang_ids,
                instansi_penyelenggara, petugas_ids, kelengkapan, created_by,
                primaryIds.surat_undangan_masuk, primaryIds.surat_undangan_keluar, primaryIds.bahan_desk, primaryIds.paparan, sesi
            ]
        );

        const kegiatan_id = result.insertId;

        // Update ONLY the mapping records created in THIS request
        if (mappingIds.length > 0) {
            await connection.query(
                'UPDATE kegiatan_manajemen_dokumen SET kegiatan_id = ? WHERE id IN (?)',
                [kegiatan_id, mappingIds]
            );
        }

        // --- NEW: Sync Tematik to ALL documents linked in this request ---
        // 1. Get all docIds linked
        const [allRelDocs] = await connection.query('SELECT dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [kegiatan_id]);
        const docIdsToSync = allRelDocs.map(d => d.dokumen_id);
        
        // 2. Perform Sync
        await syncDokumenTematik(connection, docIdsToSync, tematik_ids, kegiatan_id);

        // --- NEW: Sync to Individual Employee Logbook ---
        await syncToKegiatanPegawai(connection, kegiatan_id);

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
        const query = `
            SELECT 
                k.*,
                jk.nama as jenis_kegiatan_nama,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', kd.id,
                            'nama_file', kd.nama_file,
                            'path', kd.path,
                            'tipe_dokumen', kd.tipe_dokumen,
                            'dokumen_id', kd.dokumen_id,
                            'is_trash', COALESCE(d.is_deleted, 0)
                        )
                    )
                    FROM kegiatan_manajemen_dokumen kd
                    LEFT JOIN dokumen_upload d ON kd.dokumen_id = d.id
                    WHERE kd.kegiatan_id = k.id
                ) as dokumen
            FROM kegiatan_manajemen k
            LEFT JOIN master_tipe_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            ORDER BY k.tanggal DESC, k.created_at DESC
        `;
        const [rows] = await pool.query(query);
        const data = rows.map(row => ({
            ...row,
            dokumen: typeof row.dokumen === 'string' ? JSON.parse(row.dokumen) : (row.dokumen || [])
        }));
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
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', kd.id,
                            'nama_file', kd.nama_file,
                            'path', kd.path,
                            'tipe_dokumen', kd.tipe_dokumen,
                            'dokumen_id', kd.dokumen_id,
                            'is_trash', COALESCE(d.is_deleted, 0)
                        )
                    )
                    FROM kegiatan_manajemen_dokumen kd
                    LEFT JOIN dokumen_upload d ON kd.dokumen_id = d.id
                    WHERE kd.kegiatan_id = k.id
                ) as dokumen
            FROM kegiatan_manajemen k
            WHERE k.id = ?
        `;
        const [rows] = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        
        const data = {
            ...rows[0],
            dokumen: typeof rows[0].dokumen === 'string' ? JSON.parse(rows[0].dokumen) : (rows[0].dokumen || [])
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
            jenis_dokumen_ids
        } = req.body;

        const jd_ids = jenis_dokumen_ids ? JSON.parse(jenis_dokumen_ids) : {};
        const updated_by = req.user ? req.user.id : null;

        // Get old record to handle file replacements
        const [oldRows] = await connection.query('SELECT * FROM kegiatan_manajemen WHERE id = ?', [id]);
        if (oldRows.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        const oldData = oldRows[0];

        // Helper to insert into dokumen_upload
        const insertToDokumenUpload = async (file, fieldType) => {
            const nama_file = file.originalname;
            const filePath = '/uploads/kegiatan/' + file.filename;
            const ukuran = file.size;
            const jenis_id = jd_ids[fieldType] || jd_ids[file.fieldname] || null;

            const [queryResult] = await connection.query(
                `INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [nama_file, filePath, ukuran, jenis_id, updated_by]
            );
            
            const newDocId = queryResult.insertId;

            await connection.query(
                'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [newDocId, updated_by, 'upload', `File diupload melalui modul Isi Kegiatan (${fieldType}) - Update`]
            );

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
        if (req.body.selected_library_doc_ids) {
            const libraryDocs = JSON.parse(req.body.selected_library_doc_ids); // { field: [ids] }
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
                    }
                }
            }
        }

        await connection.query(
            `UPDATE kegiatan_manajemen SET 
                tanggal = ?, tanggal_akhir = ?, nama_kegiatan = ?, 
                jenis_kegiatan_id = ?, bidang_ids = ?, instansi_penyelenggara = ?, 
                kelengkapan = ?, tematik_ids = ?, petugas_ids = ?, sesi = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP,
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
                kelengkapan, tematik_ids, petugas_ids, sesi, updated_by,
                updatedPrimary.surat_undangan_masuk, updatedPrimary.surat_undangan_keluar, updatedPrimary.bahan_desk, updatedPrimary.paparan,
                updatedPrimary.surat_undangan_masuk_id, updatedPrimary.surat_undangan_keluar_id, updatedPrimary.bahan_desk_id, updatedPrimary.paparan_id,
                id
            ]
        );

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
            const [relRows] = await connection.query('SELECT kegiatan_id, tipe_dokumen FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?', [docId]);
            for (const rel of relRows) {
                if (rel.kegiatan_id === parseInt(id)) {
                    if (updatedPrimary[rel.tipe_dokumen + '_id'] === docId) {
                        updatedPrimary[rel.tipe_dokumen] = null;
                        updatedPrimary[rel.tipe_dokumen + '_id'] = null;
                    }
                }
            }
            // Remove activity-document links
            await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ? AND kegiatan_id = ?', [docId, id]);

            // --- NEW: Remove activity-derived thematic tags ---
            await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = ?', [docId, id]);
        }

        // UNLINK: Just remove from this activity
        for (const relId of unlinkIds) {
            const [relRows] = await connection.query('SELECT dokumen_id, tipe_dokumen FROM kegiatan_manajemen_dokumen WHERE id = ?', [relId]);
            if (relRows.length > 0) {
                const { dokumen_id, tipe_dokumen } = relRows[0];
                if (updatedPrimary[tipe_dokumen + '_id'] === dokumen_id) {
                    updatedPrimary[tipe_dokumen] = null;
                    updatedPrimary[tipe_dokumen + '_id'] = null;
                }
                // --- NEW: Remove activity-derived thematic tags ---
                await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = ?', [dokumen_id, id]);

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
                kelengkapan = ?, tematik_ids = ?, petugas_ids = ?, sesi = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP,
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
                kelengkapan, tematik_ids, petugas_ids, sesi, updated_by,
                updatedPrimary.surat_undangan_masuk, updatedPrimary.surat_undangan_keluar, updatedPrimary.bahan_desk, updatedPrimary.paparan,
                updatedPrimary.surat_undangan_masuk_id, updatedPrimary.surat_undangan_keluar_id, updatedPrimary.bahan_desk_id, updatedPrimary.paparan_id,
                id
            ]
        );

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

        const deleteOldDokumen = async (docId) => {
            if (!docId) return;
            const [rows] = await connection.query('SELECT path FROM dokumen_upload WHERE id = ?', [docId]);
            if (rows.length > 0) {
                const absPath = path.join(__dirname, '../..', rows[0].path);
                if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
            }
            await connection.query('DELETE FROM dokumen_upload WHERE id = ?', [docId]);
        };

        // Delete single files from global dokumen_upload
        await deleteOldDokumen(kegiatan[0].surat_undangan_masuk_id);
        await deleteOldDokumen(kegiatan[0].surat_undangan_keluar_id);
        await deleteOldDokumen(kegiatan[0].bahan_desk_id);
        await deleteOldDokumen(kegiatan[0].paparan_id);

        // Delete multi files from global dokumen_upload
        const [dokumen] = await connection.query('SELECT dokumen_id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [id]);
        for (const d of dokumen) {
            await deleteOldDokumen(d.dokumen_id);
        }

        // Delete from local activity tables
        await connection.query('DELETE FROM dokumen_tematik WHERE kegiatan_id = ?', [id]);
        await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ?', [id]);
        
        // --- NEW: Remove from Individual Employee Logbook ---
        await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [id]);

        await connection.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [id]);

        await connection.commit();
        res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
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
    checkAvailability
};
