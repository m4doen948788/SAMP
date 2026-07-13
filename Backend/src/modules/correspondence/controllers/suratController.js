const pool = require('../../../config/db');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const auditService = require('../../../utils/auditService');
const { generateSlug } = require('../../../utils/cryptoUtils');

const syncSuratTematik = async (connection, dokumenId, kegiatanId) => {
    if (!dokumenId || !kegiatanId) return;

    // 1. Get activity themes
    const [kegData] = await connection.query('SELECT tematik_ids FROM kegiatan_manajemen WHERE id = ?', [kegiatanId]);
    if (kegData.length === 0) return;

    const tags = !kegData[0].tematik_ids ? [] : String(kegData[0].tematik_ids).split(',').map(s => s.trim()).filter(Boolean);
    if (tags.length === 0) return;

    // 2. Mirror to global (kegiatan_id = 0) ONLY IF it doesn't have any global tags yet 
    const [globalExist] = await connection.query('SELECT 1 FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = 0 LIMIT 1', [dokumenId]);
    if (globalExist.length === 0) {
        for (const tId of tags) {
            await connection.query('INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, 0)', [dokumenId, tId]);
        }
    }

    // 3. Sync for THIS specific activity
    await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = ?', [dokumenId, kegiatanId]);
    for (const tId of tags) {
        await connection.query('INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, ?)', [dokumenId, tId, kegiatanId]);
    }
};

const suratController = {
    // 1. Ambil Nomor Surat Berikutnya (Auto-Numbering)
    getNextNumber: async (req, res) => {
        try {
            const { bidang_id } = req.query;
            const instansi_id = req.user.instansi_id;
            const tahun = new Date().getFullYear();

            // Ambil singkatan bidang
            const [bidangRows] = await pool.query(
                'SELECT COALESCE(singkatan, LEFT(nama_bidang, 3)) as kode FROM master_bidang_instansi WHERE id = ?',
                [bidang_id]
            );
            const kodeBidang = bidangRows.length > 0 ? bidangRows[0].kode.toUpperCase() : 'SURAT';

            // Cek counter terakhir
            const [counterRows] = await pool.query(
                'SELECT last_number FROM surat_counters WHERE instansi_id = ? AND bidang_id = ? AND tahun = ?',
                [instansi_id, bidang_id, tahun]
            );

            let nextNum = 1;
            if (counterRows.length > 0) {
                nextNum = counterRows[0].last_number + 1;
            }

            // Format nomor: 001/SINGKATAN/ROMAN-MONTH/YEAR
            const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
            const monthStr = romanMonths[new Date().getMonth()];
            const formattedNumber = `${String(nextNum).padStart(3, '0')}/${kodeBidang}/${monthStr}/${tahun}`;

            res.json({ success: true, next_number: formattedNumber, counter: nextNum });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 2. Simpan Surat Masuk
    saveSuratMasuk: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { nomor_surat, perihal, asal_surat, tanggal_surat, tanggal_acara, tanggal_akhir, dokumen_id, bidang_id, jenis_surat_id, kegiatan_id, tipe_surat, employee_id } = req.body;
            
            const finalType = tipe_surat || 'masuk';
            const approvalStatus = finalType === 'internal' ? 'APPROVED' : null;

            const { generateSlug } = require('../../../utils/cryptoUtils');
            const slug = generateSlug();
            
            const [result] = await connection.query(
                'INSERT INTO surat (nomor_surat, jenis_surat_id, perihal, asal_surat, tanggal_surat, tanggal_acara, tanggal_akhir, tipe_surat, dokumen_id, instansi_id, bidang_id, created_by, approval_status, employee_id, verification_slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [nomor_surat || null, jenis_surat_id || null, perihal, asal_surat, tanggal_surat, tanggal_acara || null, tanggal_akhir || null, finalType, dokumen_id, req.user.instansi_id, bidang_id, req.user.id, approvalStatus, employee_id || null, slug]
            );

            // Fetch document details if dokumen_id is provided
            let docInfo = null;
            if (dokumen_id) {
                const [docRows] = await connection.query('SELECT nama_file, path FROM dokumen_upload WHERE id = ?', [dokumen_id]);
                if (docRows.length > 0) {
                    docInfo = docRows[0];
                }
            }

            // Link to activity if provided
            if (kegiatan_id && docInfo) {
                await connection.query(
                    'INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id) VALUES (?, ?, ?, ?, ?)',
                    [kegiatan_id, docInfo.nama_file, docInfo.path, 'surat_undangan_masuk', dokumen_id]
                );
                // Sync thematic tagging
                await syncSuratTematik(connection, dokumen_id, kegiatan_id);

                // Add History Log
                const [kegData] = await connection.query('SELECT nama_kegiatan FROM kegiatan_kegiatan WHERE id = ?', [kegiatan_id]).catch(() => [[]]);
                const namaKegiatan = kegData.length > 0 ? kegData[0].nama_kegiatan : 'Kegiatan';
                
                await connection.query('INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)', 
                    [kegiatan_id, req.user.id, 'edit', `Menautkan surat: ${nomor_surat} - ${perihal} (Masuk)`]);
                
                await connection.query('INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [dokumen_id, req.user.id, 'link', `Dokumen ditautkan ke kegiatan: ${namaKegiatan}`]);
            }

            // Record initial history
            await connection.query(
                'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [result.insertId, req.user.id, 'create', `Surat masuk dicatat pertama kali oleh ${req.user.nama_lengkap || 'User'}`]
            );

            // Fetch jenis_surat name from master_dokumen for frontend mapping
            let jenisSuratNama = '';
            if (jenis_surat_id) {
                const [jsRows] = await connection.query('SELECT dokumen FROM master_dokumen WHERE id = ?', [jenis_surat_id]);
                if (jsRows.length > 0) {
                    jenisSuratNama = jsRows[0].dokumen;
                }
            }

            await connection.commit();

            if (approvalStatus === 'APPROVED') {
                try {
                    const { integrateLeaveToLogbook } = require('./suratApprovalController');
                    await integrateLeaveToLogbook(result.insertId);
                } catch (e) {
                    console.error('Failed to auto-integrate leave to logbook:', e);
                }
            }
            
            res.json({ 
                success: true, 
                message: 'Surat masuk berhasil dicatat', 
                id: result.insertId,
                data: {
                    id: result.insertId,
                    dokumen_id: dokumen_id,
                    nama_file: docInfo ? docInfo.nama_file : (nomor_surat || perihal),
                    file_path: docInfo ? docInfo.path : '',
                    tipe_surat: finalType,
                    nomor_surat: nomor_surat,
                    jenis_surat_nama: jenisSuratNama
                }
            });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ success: false, message: err.message });
        } finally {
            connection.release();
        }
    },

    // 3. Generate Surat Keluar (.docx)
    generateSuratKeluar: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { nomor_surat, jenis_surat_id, perihal, tujuan_surat, tanggal_surat, bidang_id, isi_surat, jabatan_penanda, nama_penanda, nip_penanda } = req.body;
            const instansi_id = req.user.instansi_id;
            const tahun = new Date().getFullYear();

            // Ambil Profil Kop Instansi
            const [instansiRows] = await pool.query('SELECT * FROM master_instansi_daerah WHERE id = ?', [instansi_id]);
            const inst = instansiRows[0];

            // Load Template .docx
            const templatePath = path.resolve(__dirname, '../../../../templates/template_surat_undangan.docx');
            if (!fs.existsSync(templatePath)) {
                // If template doesn't exist, we'll create a dummy for now but notify the error 
                // In production, the file must exist.
                throw new Error('Template "template_surat_undangan.docx" tidak ditemukan di folder /templates/');
            }

            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            // Fill data
            doc.render({
                nama_instansi: inst.nama_instansi_kop || inst.instansi,
                alamat_instansi: inst.alamat_kop || '',
                telepon_instansi: inst.telepon_kop || '',
                email_instansi: inst.email_kop || '',
                website_instansi: inst.website_kop || '',
                nomor_surat: nomor_surat,
                perihal: perihal,
                tanggal_format: new Date(tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                tujuan: tujuan_surat,
                isi: isi_surat,
                jabatan: jabatan_penanda,
                nama_pejabat: nama_penanda,
                nip_pejabat: nip_penanda
            });

            const buf = doc.getZip().generate({ type: 'nodebuffer' });
            
            // Simpan ke disk & tabel dokumen_upload (agar masuk Manajemen Dokumen)
            const fileName = `Surat_Keluar_${Date.now()}.docx`;
            const filePath = `/uploads/${fileName}`;
            const absolutePath = path.resolve(__dirname, '../../../../uploads/', fileName);
            
            fs.writeFileSync(absolutePath, buf);
            // const dummyBuf = Buffer.from("File surat dalam proses instalasi library...");
            // fs.writeFileSync(absolutePath, dummyBuf);

            // Insert ke dokumen_upload
            const [docResult] = await connection.query(
                'INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by) VALUES (?, ?, ?, ?, ?)',
                [nomor_surat.replace(/\//g, '_') + '.docx', filePath, buf.length, 1, req.user.id]
            );

            const slug = generateSlug();
            
            // Insert ke tabel surat
            const [suratResult] = await connection.query(
                'INSERT INTO surat (nomor_surat, jenis_surat_id, perihal, tujuan_surat, tanggal_surat, tipe_surat, dokumen_id, instansi_id, bidang_id, created_by, verification_slug) VALUES (?, ?, ?, ?, ?, "keluar", ?, ?, ?, ?, ?)',
                [nomor_surat, jenis_surat_id || null, perihal, tujuan_surat, tanggal_surat, docResult.insertId, instansi_id, bidang_id, req.user.id, slug]
            );

            // Link to activity if provided
            if (kegiatan_id) {
                await connection.query(
                    'INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id) VALUES (?, ?, ?, ?, ?)',
                    [kegiatan_id, nomor_surat.replace(/\//g, '_') + '.docx', filePath, 'surat_undangan_keluar', docResult.insertId]
                );
                // Sync thematic tagging
                await syncSuratTematik(connection, docResult.insertId, kegiatan_id);

                // Add History Log
                const [kegData] = await connection.query('SELECT nama_kegiatan FROM kegiatan_manajemen WHERE id = ?', [kegiatan_id]);
                const namaKegiatan = kegData.length > 0 ? kegData[0].nama_kegiatan : 'Kegiatan';
                
                await connection.query('INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)', 
                    [kegiatan_id, req.user.id, 'edit', `Menautkan surat: ${nomor_surat} - ${perihal} (Keluar)`]);
                
                await connection.query('INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [docResult.insertId, req.user.id, 'link', `Dokumen ditautkan ke kegiatan: ${namaKegiatan}`]);
            }

            // Update Counter
            const lastNum = parseInt(nomor_surat.split('/')[0]);
            await connection.query(
                'INSERT INTO surat_counters (instansi_id, bidang_id, tahun, last_number) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_number = ?',
                [instansi_id, bidang_id, tahun, lastNum, lastNum]
            );

            // Record initial history
            await connection.query(
                'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [suratResult.insertId, req.user.id, 'create', `Surat keluar digaungkan pertama kali oleh ${req.user.nama_lengkap || 'User'}`]
            );

            // Fetch jenis_surat name from master_dokumen for frontend mapping
            let jenisSuratNama = '';
            if (jenis_surat_id) {
                const [jsRows] = await connection.query('SELECT dokumen FROM master_dokumen WHERE id = ?', [jenis_surat_id]);
                if (jsRows.length > 0) {
                    jenisSuratNama = jsRows[0].dokumen;
                }
            }

            await connection.commit();

            res.json({ 
                success: true, 
                message: 'Surat berhasil digaungkan dan diarsipkan', 
                data: { 
                    id: docResult.insertId, // Document ID is what parent expects for linking
                    dokumen_id: docResult.insertId,
                    surat_id: suratResult.insertId,
                    nama_file: nomor_surat.replace(/\//g, '_') + '.docx',
                    file_path: filePath,
                    path: filePath, 
                    tipe_surat: 'keluar',
                    nomor_surat: nomor_surat,
                    jenis_surat_nama: jenisSuratNama
                } 
            });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ success: false, message: err.message });
        } finally {
            connection.release();
        }
    },

    // 4. Ambil Detail Surat (Single)
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
                SELECT s.*, d.path as file_path, d.nama_file, b.nama_bidang, b.singkatan as singkatan_bidang, 
                COALESCE(md_temp.dokumen, md_dir.dokumen) as jenis_surat_nama,
                COALESCE(md_temp.id, md_dir.id) as master_dokumen_id,
                pp.nama_lengkap as nama_pengusul,
                pp_creator.nama_lengkap as creator_nama,
                s.created_at,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'id', sa.id,
                        'role', sa.role, 
                        'status', sa.status, 
                        'reason', sa.reason, 
                        'urutan', sa.urutan,
                        'approver_name', pp_sa.nama_lengkap
                    ))
                    FROM surat_approvals sa
                    LEFT JOIN users u_sa ON sa.approver_id = u_sa.id
                    LEFT JOIN profil_pegawai pp_sa ON u_sa.profil_pegawai_id = pp_sa.id
                    WHERE sa.surat_id = s.id
                    ORDER BY sa.urutan DESC
                ) as approval_chain,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', u_h.nama_lengkap,
                            'user_bidang', COALESCE(b_h.singkatan, b2_h.singkatan, b_h.nama_bidang, b2_h.nama_bidang)
                        )
                    )
                    FROM surat_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
                    LEFT JOIN master_bidang_instansi b_h ON u_h.bidang_id = b_h.id
                    LEFT JOIN master_bidang b2_h ON u_h.bidang_id = b2_h.id
                    WHERE h.surat_id = s.id
                ) as edit_history
                FROM surat s
                LEFT JOIN dokumen_upload d ON s.dokumen_id = d.id
                LEFT JOIN master_bidang_instansi b ON s.bidang_id = b.id
                LEFT JOIN surat_templates st ON (s.jenis_surat_id = st.id)
                LEFT JOIN master_dokumen md_temp ON st.master_dokumen_id = md_temp.id
                LEFT JOIN master_dokumen md_dir ON (s.jenis_surat_id = md_dir.id)
                LEFT JOIN profil_pegawai pp ON s.employee_id = pp.id
                LEFT JOIN users u_creator ON s.created_by = u_creator.id
                LEFT JOIN profil_pegawai pp_creator ON u_creator.profil_pegawai_id = pp_creator.id
                WHERE s.id = ? AND s.is_deleted = 0
            `;
            const [rows] = await pool.query(query, [id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Surat tidak ditemukan' });
            }
            const data = {
                ...rows[0],
                edit_history: typeof rows[0].edit_history === 'string' ? JSON.parse(rows[0].edit_history) : rows[0].edit_history
            };
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 5. List Surat (dengan filter akses per bidang)
    getAll: async (req, res) => {
        try {
            const { type, bidang_id, instansi_id } = req.query;
            const userRole = req.user.tipe_user_id;
            const isSuperAdmin = userRole === 1;
            const isPimpinan = [2, 5].includes(userRole);

            let query = `
                SELECT s.*, d.path as file_path, d.nama_file, b.nama_bidang, b.singkatan as singkatan_bidang, 
                COALESCE(md_temp.dokumen, md_dir.dokumen) as jenis_surat_nama,
                COALESCE(md_temp.id, md_dir.id) as master_dokumen_id,
                pp.nama_lengkap as nama_pengusul,
                pp_creator.nama_lengkap as creator_nama,
                s.created_at,
                (
                    SELECT k.nama_kegiatan 
                    FROM kegiatan_manajemen k
                    LEFT JOIN kegiatan_manajemen_dokumen kd ON k.id = kd.kegiatan_id
                    WHERE k.is_deleted = 0 AND (
                        kd.dokumen_id = s.dokumen_id OR 
                        k.surat_undangan_masuk_id = s.dokumen_id OR 
                        k.surat_undangan_keluar_id = s.dokumen_id OR 
                        k.bahan_desk_id = s.dokumen_id OR 
                        k.paparan_id = s.dokumen_id
                    )
                    LIMIT 1
                ) as nama_kegiatan_terkait,
                (
                    SELECT k.id 
                    FROM kegiatan_manajemen k
                    LEFT JOIN kegiatan_manajemen_dokumen kd ON k.id = kd.kegiatan_id
                    WHERE k.is_deleted = 0 AND (
                        kd.dokumen_id = s.dokumen_id OR 
                        k.surat_undangan_masuk_id = s.dokumen_id OR 
                        k.surat_undangan_keluar_id = s.dokumen_id OR 
                        k.bahan_desk_id = s.dokumen_id OR 
                        k.paparan_id = s.dokumen_id
                    )
                    LIMIT 1
                ) as kegiatan_id_terkait,
                (
                    SELECT GROUP_CONCAT(DISTINCT mt.nama SEPARATOR ', ')
                    FROM dokumen_tematik dt
                    JOIN master_tematik mt ON dt.tematik_id = mt.id
                    WHERE dt.dokumen_id = s.dokumen_id
                ) as tematik_terkait,
                (
                    SELECT GROUP_CONCAT(DISTINCT dt.tematik_id SEPARATOR ',')
                    FROM dokumen_tematik dt
                    WHERE dt.dokumen_id = s.dokumen_id AND dt.kegiatan_id = 0
                ) as tematik_ids,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'id', sa.id,
                        'role', sa.role, 
                        'status', sa.status, 
                        'reason', sa.reason, 
                        'urutan', sa.urutan,
                        'approver_name', pp_sa.nama_lengkap,
                        'logbook_status', (
                            SELECT khp.nama_kegiatan 
                            FROM kegiatan_harian_pegawai khp 
                            WHERE khp.profil_pegawai_id = pp_sa.id 
                              AND khp.tanggal = CURRENT_DATE 
                              AND khp.tipe_kegiatan = 'C' 
                            LIMIT 1
                        )
                    ))
                    FROM surat_approvals sa
                    LEFT JOIN users u_sa ON sa.approver_id = u_sa.id
                    LEFT JOIN profil_pegawai pp_sa ON u_sa.profil_pegawai_id = pp_sa.id
                    WHERE sa.surat_id = s.id
                    ORDER BY sa.urutan DESC
                ) as approval_chain,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', h.id,
                            'aksi', h.aksi,
                            'keterangan', h.keterangan,
                            'created_at', h.created_at,
                            'user_nama', u_h.nama_lengkap,
                            'user_bidang', COALESCE(b_h.singkatan, b2_h.singkatan, b_h.nama_bidang, b2_h.nama_bidang)
                        )
                    )
                    FROM surat_edit_history h
                    LEFT JOIN users usr_h ON h.user_id = usr_h.id
                    LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
                    LEFT JOIN master_bidang_instansi b_h ON u_h.bidang_id = b_h.id
                    LEFT JOIN master_bidang b2_h ON u_h.bidang_id = b2_h.id
                    WHERE h.surat_id = s.id
                ) as edit_history
                FROM surat s
                LEFT JOIN dokumen_upload d ON s.dokumen_id = d.id
                LEFT JOIN master_bidang_instansi b ON s.bidang_id = b.id
                LEFT JOIN surat_templates st ON (s.jenis_surat_id = st.id)
                LEFT JOIN master_dokumen md_temp ON st.master_dokumen_id = md_temp.id
                LEFT JOIN master_dokumen md_dir ON (s.jenis_surat_id = md_dir.id)
                LEFT JOIN profil_pegawai pp ON s.employee_id = pp.id
                LEFT JOIN users u_creator ON s.created_by = u_creator.id
                LEFT JOIN profil_pegawai pp_creator ON u_creator.profil_pegawai_id = pp_creator.id
                WHERE 1=1
            `;
            const params = [];

            // Filter Instansi (Superadmin can see all or filter by one, others locked to their own)
            if (isSuperAdmin) {
                if (instansi_id && instansi_id !== 'all') {
                    query += ' AND s.instansi_id = ?';
                    params.push(instansi_id);
                }
            } else {
                query += ' AND s.instansi_id = ?';
                params.push(req.user.instansi_id);
            }

            if (type) {
                query += ' AND s.tipe_surat = ?';
                params.push(type);
            }

            // Otoritas Akses DokTRIN v4.3 - Bidang Filtering
            if (bidang_id && bidang_id !== 'all') {
                query += ' AND s.bidang_id = ?';
                params.push(bidang_id);
            }

            query += ' ORDER BY s.tanggal_surat DESC, s.id DESC';
            const [rows] = await pool.query(query, params);
            
            const data = rows.map(row => ({
                ...row,
                edit_history: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : row.edit_history
            }));

            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // 5. Update Surat
    update: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;
            const { nomor_surat, jenis_surat_id, perihal, asal_surat, tujuan_surat, tanggal_surat, tanggal_acara, tanggal_akhir, dokumen_id, bidang_id, kegiatan_id, tipe_surat, tematik_ids, employee_id } = req.body;

            // 1. Get current surat data (Full snapshot for Audit Trail)
            const [currentRows] = await connection.query('SELECT * FROM surat WHERE id = ?', [id]);
            if (currentRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Surat tidak ditemukan' });
            }
            const oldData = currentRows[0];
            const existingDocId = oldData.dokumen_id;
            
            // 2. Robust current link detection...
            const activeDocId = dokumen_id || existingDocId;
            // ... (rest of link detection logic)
            const [currentActRows] = await connection.query(`
                SELECT k.id 
                FROM kegiatan_manajemen k
                LEFT JOIN kegiatan_manajemen_dokumen kd ON k.id = kd.kegiatan_id
                WHERE k.is_deleted = 0 AND ? IS NOT NULL AND (
                    kd.dokumen_id = ? OR 
                    k.surat_undangan_masuk_id = ? OR 
                    k.surat_undangan_keluar_id = ? OR 
                    k.bahan_desk_id = ? OR 
                    k.paparan_id = ?
                )
                LIMIT 1
            `, [activeDocId, activeDocId, activeDocId, activeDocId, activeDocId, activeDocId]);
            
            const oldKegiatanId = currentActRows.length > 0 ? currentActRows[0].id : null;

            await connection.query(
                `UPDATE surat SET 
                    nomor_surat = ?, 
                    jenis_surat_id = ?, 
                    perihal = ?, 
                    asal_surat = ?, 
                    tujuan_surat = ?, 
                    tanggal_surat = ?, 
                    tanggal_acara = ?, 
                    tanggal_akhir = ?,
                    dokumen_id = ?, 
                    bidang_id = ?,
                    employee_id = ?
                 WHERE id = ? AND instansi_id = ?`,
                [nomor_surat || null, jenis_surat_id || null, perihal, asal_surat || null, tujuan_surat || null, tanggal_surat, tanggal_acara || null, tanggal_akhir || null, activeDocId || null, bidang_id, employee_id || null, id, req.user.instansi_id]
            );
            
            // 2b. Update manual tagging (global tags)
            if (activeDocId && tematik_ids && Array.isArray(tematik_ids)) {
                await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = 0', [activeDocId]);
                for (const tId of tematik_ids) {
                    await connection.query('INSERT IGNORE INTO dokumen_tematik (dokumen_id, tematik_id, kegiatan_id) VALUES (?, ?, 0)', [activeDocId, tId]);
                }
            }

            // 3. Log history of changes
            let changes = [];
            if (oldData.nomor_surat !== (nomor_surat || null)) changes.push(`Nomor diubah: "${oldData.nomor_surat || '-'}" -> "${nomor_surat || '-'}"`);
            if (oldData.perihal !== perihal) changes.push(`Perihal diubah: "${oldData.perihal}" -> "${perihal}"`);
            if (oldData.bidang_id !== parseInt(bidang_id)) changes.push(`Bidang dipindahkan`);

            if (changes.length > 0) {
                await connection.query(
                    'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [id, req.user.id, 'edit', changes.join(', ')]
                );
            }

            // 4. Log to Audit Trail
            await auditService.log({
                user_id: req.user.id,
                action: 'UPDATE_SURAT',
                table_name: 'surat',
                record_id: id,
                old_values: oldData,
                new_values: req.body,
                req: req
            });

            const finalDocId = activeDocId;
            if (finalDocId) {
                const normalizedKegId = (kegiatan_id === '' || kegiatan_id === 0 || kegiatan_id === '0') ? null : kegiatan_id;
                const normalizedOldKegId = (oldKegiatanId === '' || oldKegiatanId === 0 || oldKegiatanId === '0') ? null : oldKegiatanId;

                if (Number(normalizedKegId) !== Number(normalizedOldKegId)) {
                    // 1. Remove old Junction link
                    await connection.query('DELETE FROM kegiatan_manajemen_dokumen WHERE dokumen_id = ?', [finalDocId]);
                    
                    // Force clear global tags if unlinking
                    if (!normalizedKegId) {
                        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND kegiatan_id = 0', [finalDocId]);
                    }
                    
                    // 2. Clear Primary Activity links for the OLD activity
                    if (oldKegiatanId) {
                        // Fetch old activity name for document log
                        const [oldKegData] = await connection.query('SELECT nama_kegiatan FROM kegiatan_manajemen WHERE id = ?', [oldKegiatanId]);
                        const oldNamaKegiatan = oldKegData.length > 0 ? oldKegData[0].nama_kegiatan : 'Kegiatan';

                        await connection.query(`
                            UPDATE kegiatan_manajemen SET 
                                surat_undangan_masuk_id = CASE WHEN surat_undangan_masuk_id = ? THEN NULL ELSE surat_undangan_masuk_id END,
                                surat_undangan_keluar_id = CASE WHEN surat_undangan_keluar_id = ? THEN NULL ELSE surat_undangan_keluar_id END,
                                bahan_desk_id = CASE WHEN bahan_desk_id = ? THEN NULL ELSE bahan_desk_id END,
                                paparan_id = CASE WHEN paparan_id = ? THEN NULL ELSE paparan_id END
                            WHERE id = ?
                        `, [dokumen_id, dokumen_id, dokumen_id, dokumen_id, oldKegiatanId]);

                        // 3. Remove thematic tags for that specific activity AND global tags 
                        await connection.query('DELETE FROM dokumen_tematik WHERE dokumen_id = ? AND (kegiatan_id = ? OR kegiatan_id = 0)', [finalDocId, normalizedOldKegId]);

                        // Add Unlink History Log
                        await connection.query('INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)', 
                            [normalizedOldKegId, req.user.id, 'edit', `Melepas tautan surat: ${nomor_surat} - ${perihal}`]);
                        
                        await connection.query('INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                            [dokumen_id, req.user.id, 'unlink', `Tautan ke kegiatan "${oldNamaKegiatan}" dilepas`]);
                    }

                    // 4. Create NEW link if provided
                    if (normalizedKegId) {
                        const [docRows] = await connection.query('SELECT nama_file, path FROM dokumen_upload WHERE id = ?', [finalDocId]);
                        if (docRows.length > 0) {
                            const tipeDok = (tipe_surat || 'masuk') === 'masuk' ? 'surat_undangan_masuk' : 'surat_undangan_keluar';
                            await connection.query(
                                'INSERT INTO kegiatan_manajemen_dokumen (kegiatan_id, nama_file, path, tipe_dokumen, dokumen_id) VALUES (?, ?, ?, ?, ?)',
                                [normalizedKegId, docRows[0].nama_file, docRows[0].path, tipeDok, finalDocId]
                            );
                            await syncSuratTematik(connection, finalDocId, normalizedKegId);
    
                            // Add Link History Log
                            const [newKegData] = await connection.query('SELECT nama_kegiatan FROM kegiatan_manajemen WHERE id = ?', [normalizedKegId]);
                            const newNamaKegiatan = newKegData.length > 0 ? newKegData[0].nama_kegiatan : 'Kegiatan';
                            
                            await connection.query('INSERT INTO kegiatan_edit_history (kegiatan_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)', 
                                [normalizedKegId, req.user.id, 'edit', `Menautkan surat: ${nomor_surat} - ${perihal}`]);
                            
                            await connection.query('INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                                [finalDocId, req.user.id, 'link', `Dokumen ditautkan ke kegiatan: ${newNamaKegiatan}`]);
                        }
                    }
                }
            }

            await connection.commit();

            if (oldData.approval_status === 'APPROVED') {
                try {
                    const { integrateLeaveToLogbook } = require('./suratApprovalController');
                    await integrateLeaveToLogbook(id);
                } catch (e) {
                    console.error('Failed to re-integrate leave to logbook on update:', e);
                }
            }

            res.json({ success: true, message: 'Surat berhasil diperbarui' });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ success: false, message: err.message });
        } finally {
            connection.release();
        }
    },

    // 6. Hapus Surat
    delete: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { id } = req.params;

            // 1. Ambil dokumen_id yang terkait dengan surat ini
            const [suratRows] = await connection.query('SELECT dokumen_id, nomor_surat, perihal FROM surat WHERE id = ?', [id]);
            if (suratRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Surat tidak ditemukan' });
            }

            const { dokumen_id, nomor_surat, perihal, bidang_id: letterBidangId } = suratRows[0];
            const userRole = req.user.tipe_user_id;
            const isSuperAdmin = userRole === 1;
            const isPimpinan = [2, 5].includes(userRole);
            const isAdminBidang = [4, 6].includes(userRole);

            // Access Control
            let hasAccess = isSuperAdmin || isPimpinan;
            if (!hasAccess && isAdminBidang && letterBidangId === req.user.bidang_id) {
                hasAccess = true;
            }

            if (!hasAccess) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Anda tidak memiliki otorisasi untuk menghapus surat ini.' });
            }

            // 2. Soft Delete Surat
            await connection.query('UPDATE surat SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [id]);

            // 3. Record History
            await connection.query(
                'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [id, req.user.id, 'delete', `Surat dipindahkan ke tempat sampah oleh ${req.user.nama_lengkap || 'User'}`]
            );

            // 4. Soft Delete associated document if exists
            if (dokumen_id) {
                await connection.query('UPDATE dokumen_upload SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [dokumen_id]);
                
                // Record history for the document
                await connection.query(
                    'INSERT INTO dokumen_edit_history (dokumen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                    [dokumen_id, req.user.id, 'delete', `Dokumen otomatis terhapus karena Surat "${nomor_surat}" dihapus.`]
                );
            }

            await connection.commit();
            res.json({ success: true, message: 'Surat berhasil dipindahkan ke tempat sampah' });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ success: false, message: err.message });
        } finally {
            connection.release();
        }
    }
};

module.exports = suratController;
