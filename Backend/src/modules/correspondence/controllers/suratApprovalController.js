const pool = require('../../../config/db');
const auditService = require('../../../utils/auditService');
const { generateSlug, generateHash } = require('../../../utils/cryptoUtils');
const os = require('os');
const notificationService = require('../../system/services/notificationService');

// Resolves localhost to actual LAN IP so QR codes work across devices on the same network
const getLanAwareUrl = (baseUrl) => {
    if (!baseUrl) return baseUrl;
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) return baseUrl;

    try {
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Pick the first non-internal IPv4 address (e.g. 192.168.x.x)
                if (net.family === 'IPv4' && !net.internal) {
                    return baseUrl.replace(/localhost|127\.0\.0\.1/, net.address);
                }
            }
        }
    } catch (e) {
        console.error('[QR] Failed to detect LAN IP, using localhost:', e.message);
    }
    return baseUrl;
};

const integrateLeaveToLogbook = async (surat_id) => {
    try {
        const [surat] = await pool.query('SELECT s.*, COALESCE(md_temp.dokumen, md_dir.dokumen) as jenis_surat_nama FROM surat s LEFT JOIN surat_templates st ON s.jenis_surat_id = st.id LEFT JOIN master_dokumen md_temp ON st.master_dokumen_id = md_temp.id LEFT JOIN master_dokumen md_dir ON s.jenis_surat_id = md_dir.id WHERE s.id = ?', [surat_id]);
        if (surat.length > 0) {
            const sData = surat[0];
            
            // Check if this is a leave letter ("Cuti")
            const isCuti = (sData.jenis_surat_nama || '').toLowerCase().includes('cuti') || 
                           (sData.perihal || '').toLowerCase().includes('cuti');
            
            if (!isCuti) return;

            let tglMulai = null;
            let tglSelesai = null;
            let alasan = sData.perihal || 'Izin Cuti';
            let jenisCuti = 'Cuti';

            // Check metadata first
            if (sData.metadata) {
                let meta;
                try {
                    meta = typeof sData.metadata === 'string' ? JSON.parse(sData.metadata) : sData.metadata;
                } catch (e) {
                    console.error('Failed to parse metadata', e);
                }
                if (meta && meta.isi) {
                    if (meta.isi.tgl_mulai) tglMulai = new Date(meta.isi.tgl_mulai);
                    if (meta.isi.tgl_selesai) tglSelesai = new Date(meta.isi.tgl_selesai);
                    if (meta.isi.alasan) alasan = meta.isi.alasan;
                    if (meta.isi.jenis_cuti_nama) jenisCuti = meta.isi.jenis_cuti_nama;
                }
            }

            // Fallbacks for dates
            if (!tglMulai) {
                tglMulai = sData.tanggal_acara ? new Date(sData.tanggal_acara) : new Date(sData.tanggal_surat);
            }
            if (!tglSelesai) {
                tglSelesai = sData.tanggal_akhir ? new Date(sData.tanggal_akhir) : new Date(tglMulai);
            }

            if (tglMulai && sData.employee_id) {
                for (let d = new Date(tglMulai); d <= tglSelesai; d.setDate(d.getDate() + 1)) {
                    const tanggalStr = d.toISOString().split('T')[0];
                    
                    // Clean up any existing logbook entries for this user on this date
                    await pool.query(
                        `DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal = ?`,
                        [sData.employee_id, tanggalStr]
                    );

                    // Insert two logbook entries for Pagi and Siang
                    const namaKegiatan = `${jenisCuti}: ${alasan}${sData.nomor_surat ? ` (No. Surat: ${sData.nomor_surat})` : ''}`;
                    for (const s of ['Pagi', 'Siang']) {
                        await pool.query(
                            `INSERT INTO kegiatan_harian_pegawai (profil_pegawai_id, tanggal, sesi, tipe_kegiatan, nama_kegiatan, keterangan, lampiran_kegiatan, created_by, updated_by)
                             VALUES (?, ?, ?, 'C', ?, ?, ?, ?, ?)`,
                            [
                                sData.employee_id,
                                tanggalStr,
                                s,
                                namaKegiatan,
                                '',
                                sData.dokumen_id ? String(sData.dokumen_id) : '',
                                sData.created_by || 1,
                                sData.created_by || 1
                            ]
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in integrateLeaveToLogbook:', error);
    }
};

exports.submitDraft = async (req, res) => {
    try {
        const { surat_id, approvers, draft_data } = req.body;
        // approvers is array of { role, approver_id, urutan }
        
        let finalSuratId = surat_id;

        // If no surat_id, create a new draft in surat table
        if (!finalSuratId && draft_data) {
            const slug = generateSlug();
            const [suratResult] = await pool.query(
                'INSERT INTO surat (nomor_surat, jenis_surat_id, perihal, tujuan_surat, tanggal_surat, tanggal_acara, tanggal_akhir, tipe_surat, instansi_id, bidang_id, created_by, approval_status, isi_surat, metadata, employee_id, verification_slug) VALUES (?, ?, ?, ?, ?, ?, ?, "internal", ?, ?, ?, "WAITING_APPROVAL", ?, ?, ?, ?)',
                [
                    draft_data.nomor_surat || 'DRAFT', 
                    draft_data.jenis_surat_id || null, 
                    draft_data.perihal, 
                    draft_data.tujuan_surat, 
                    draft_data.tanggal_surat || new Date(), 
                    draft_data.tanggal_acara || null,
                    draft_data.tanggal_akhir || null,
                    req.user.instansi_id, 
                    req.user.bidang_id || null, 
                    req.user.id,
                    draft_data.isi_surat || '',
                    draft_data.metadata || null,
                    draft_data.employee_id || null,
                    slug
                ]
            );
            finalSuratId = suratResult.insertId;
        } else if (finalSuratId) {
            // Update existing surat content and status
            await pool.query(
                'UPDATE surat SET perihal = ?, isi_surat = ?, metadata = ?, employee_id = ?, approval_status = "WAITING_APPROVAL", updated_at = NOW() WHERE id = ?', 
                [draft_data.perihal, draft_data.isi_surat, draft_data.metadata || null, draft_data.employee_id || null, finalSuratId]
            );
            
            // Clear old approval records to replace with new chain
            await pool.query('DELETE FROM surat_approvals WHERE surat_id = ?', [finalSuratId]);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid data: surat_id or draft_data required' });
        }
        
        // 2. Insert into surat_approvals
        for (const app of approvers) {
            await pool.query(
                `INSERT INTO surat_approvals (surat_id, approver_id, role, status, urutan)
                 VALUES (?, ?, ?, 'PENDING', ?)`,
                [finalSuratId, app.approver_id, app.role, app.urutan]
            );
        }

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'SUBMIT_SURAT_DRAFT',
            table_name: 'surat',
            record_id: finalSuratId,
            new_values: { approvers_count: approvers.length },
            req: req
        });

        res.status(200).json({ success: true, message: 'Draft diajukan untuk ditandatangani', surat_id: finalSuratId });
    } catch (error) {
        console.error('Error in submitDraft:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengajukan draft',
            debug_error: error.message,
            debug_code: error.code,
            debug_sqlstate: error.sqlState,
            debug_sql: error.sql
        });
    }
};

exports.getPendingApprovals = async (req, res) => {
    try {
        const user_id = req.user.id; // From verifyToken

        // Modified query: Get approvals for this user where:
        // 1. Status is PENDING (active task)
        // 2. OR Status is APPROVED/RETURNED but the surat overall is still WAITING_APPROVAL (tracking)
        const query = `
            SELECT sa.*, s.perihal, s.nomor_surat, s.tanggal_surat, s.isi_surat, s.metadata, s.jenis_surat_id,
                   pp_pembuat.nama_lengkap as pembuat_nama,
                   pp_pengusul.nama_lengkap as pengusul_nama,
                   (
                       SELECT JSON_ARRAYAGG(JSON_OBJECT(
                           'role', sa2.role, 
                           'status', sa2.status, 
                           'approver_name', pp2.nama_lengkap,
                           'urutan', sa2.urutan,
                           'reason', sa2.reason,
                           'updated_at', sa2.updated_at
                       ))
                       FROM surat_approvals sa2
                       JOIN users u2 ON sa2.approver_id = u2.id
                       JOIN profil_pegawai pp2 ON u2.profil_pegawai_id = pp2.id
                       WHERE sa2.surat_id = s.id
                       ORDER BY sa2.urutan DESC
                   ) as approval_chain
            FROM surat_approvals sa
            JOIN surat s ON sa.surat_id = s.id
            LEFT JOIN users u_pembuat ON s.created_by = u_pembuat.id
            LEFT JOIN profil_pegawai pp_pembuat ON u_pembuat.profil_pegawai_id = pp_pembuat.id
            LEFT JOIN profil_pegawai pp_pengusul ON s.employee_id = pp_pengusul.id
            WHERE sa.approver_id = ? 
              AND s.is_deleted = 0
              AND (
                  (sa.status = 'PENDING' AND s.approval_status = 'WAITING_APPROVAL' AND NOT EXISTS (
                      SELECT 1 FROM surat_approvals prev
                      WHERE prev.surat_id = sa.surat_id 
                        AND prev.urutan < sa.urutan 
                        AND prev.status != 'APPROVED'
                  ))
                  OR 
                  (sa.status != 'PENDING' AND s.approval_status = 'WAITING_APPROVAL')
              )
            ORDER BY sa.created_at DESC
        `;

        const [rows] = await pool.query(query, [user_id]);
        
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error in getPendingApprovals:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar persetujuan' });
    }
};

exports.processAction = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params; // id of surat_approvals
        const { action, reason } = req.body; // action: 'APPROVED' | 'REJECTED' | 'RETURNED'
        const user_id = req.user.id;

        // Verify ownership
        const [check] = await connection.query('SELECT * FROM surat_approvals WHERE id = ? AND approver_id = ?', [id, user_id]);
        if (check.length === 0) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const approval = check[0];

        if (action === 'APPROVED') {
            await connection.query('UPDATE surat_approvals SET status = ?, signed_at = NOW() WHERE id = ?', ['APPROVED', id]);
            
            // Reset all subsequent approvals in the chain to PENDING (since a previous step has signed/resigned)
            await connection.query(
                'UPDATE surat_approvals SET status = "PENDING", signed_at = NULL, reason = NULL WHERE surat_id = ? AND urutan > ?',
                [approval.surat_id, approval.urutan]
            );
            
            // Inject signature into HTML
            const { sign_type } = req.body; // 'signature' or 'paraf'
            const [userRows] = await connection.query('SELECT pp.signature_image, pp.paraf_image FROM users u JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id WHERE u.id = ?', [user_id]);
            
            let selectedImage = '';
            if (userRows.length > 0) {
                if (sign_type === 'paraf') {
                    selectedImage = userRows[0].paraf_image || userRows[0].signature_image || '';
                } else {
                    selectedImage = userRows[0].signature_image || userRows[0].paraf_image || '';
                }
            }

            if (selectedImage) {
                const [suratRows] = await connection.query('SELECT isi_surat FROM surat WHERE id = ?', [approval.surat_id]);
                let isiSurat = suratRows[0].isi_surat;
                
                // Add domain prefix to image dynamically
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.get('host');
                const imgUrl = selectedImage.startsWith('http') ? selectedImage : `${protocol}://${host}${selectedImage.startsWith('/') ? '' : '/'}${selectedImage}`;
                
                const regex = new RegExp(`(<(?:div|span)[^>]*data-approver-id=["']${user_id}["'][^>]*>)\\s*<\\/(?:div|span)>`, 'gi');
                
                // Adjust size: Sekretaris gets a very small paraf (30px), others based on sign_type
                const isSekretaris = String(approval.role).toLowerCase() === 'sekretaris';
                const maxHeight = isSekretaris ? '30px' : (sign_type === 'paraf' ? '50px' : '80px');
                const margin = isSekretaris ? '0' : '0 auto';
                
                // Add blue ink filter (bluish-purple like a pen)
                const inkFilter = 'invert(20%) sepia(80%) saturate(4000%) hue-rotate(230deg) brightness(100%) contrast(100%)';
                
                isiSurat = isiSurat.replace(regex, (match, p1) => {
                    const closingTag = match.toLowerCase().includes('<span') ? '</span>' : '</div>';
                    return `${p1}<img src="${imgUrl}" style="max-height: ${maxHeight}; width: auto; display: block; margin: ${margin}; filter: ${inkFilter};" />${closingTag}`;
                });
                
                await connection.query('UPDATE surat SET isi_surat = ? WHERE id = ?', [isiSurat, approval.surat_id]);
            }

            // Check if all approvals for this surat are APPROVED
            const [allApprovals] = await connection.query('SELECT status FROM surat_approvals WHERE surat_id = ?', [approval.surat_id]);
            const allApproved = allApprovals.every(a => a.status === 'APPROVED');

            if (allApproved) {
                // Generate Verification Slug
                const slug = generateSlug();
                
                // Get current host for QR code URL
                const protocol = req.get('x-forwarded-proto') || req.protocol;
                const host = req.get('x-forwarded-host') || req.get('host');
                
                // Smart Fallback for IP/Local access
                let smartHost = host;
                if (host.includes(':5001')) smartHost = host.replace(':5001', ':3000');
                else if (host.includes(':5000')) smartHost = host.replace(':5000', ':3000');

                const frontendBase = getLanAwareUrl(
                    process.env.DASHBOARD_PUBLIC_URL || process.env.FRONTEND_URL || `${protocol}://${smartHost.replace('api-', '')}`
                );
                const verifyUrl = `${frontendBase}${frontendBase.endsWith('/') ? '' : '/'}?v=${slug}`;
                
                const [finalSurat] = await connection.query('SELECT isi_surat FROM surat WHERE id = ?', [approval.surat_id]);
                let content = finalSurat[0].isi_surat;
                
                const hash = generateHash(content);

                await connection.query(
                    'UPDATE surat SET approval_status = ?, isi_surat = ?, verification_slug = ?, integrity_hash = ? WHERE id = ?', 
                    ['APPROVED', content, slug, hash, approval.surat_id]
                );
                await integrateLeaveToLogbook(approval.surat_id);
            }
        } else if (action === 'RETURNED') {
            // Logic for RETURNED: Reset all to PENDING and update main status
            await connection.query('UPDATE surat_approvals SET status = "PENDING", reason = NULL, signed_at = NULL WHERE surat_id = ?', [approval.surat_id]);
            await connection.query('UPDATE surat_approvals SET reason = ? WHERE id = ?', [reason, id]); // Keep reason on the one who returned
            
            // Revert HTML: Remove any injected signature images
            const [suratRows] = await connection.query('SELECT isi_surat FROM surat WHERE id = ?', [approval.surat_id]);
            let isiSurat = suratRows[0].isi_surat;
            
            const stripRegex = /(<div[^>]*data-approver-id="[^"]*"[^>]*>)<img[^>]*><\/div>/g;
            isiSurat = isiSurat.replace(stripRegex, '$1</div>');
            
            await connection.query('UPDATE surat SET approval_status = "WAITING_APPROVAL", isi_surat = ? WHERE id = ?', [isiSurat, approval.surat_id]);
        } else {
            // REJECTED
            const isPengusul = String(approval.role).toLowerCase() === 'pengusul';
            const mainStatus = isPengusul ? 'CANCELLED' : 'REJECTED';
            await connection.query('UPDATE surat SET approval_status = ? WHERE id = ?', [mainStatus, approval.surat_id]);

            // Notify proposer if rejected by someone else
            if (action === 'REJECTED' && !isPengusul) {
                const [suratRows] = await connection.query('SELECT created_by, perihal FROM surat WHERE id = ?', [approval.surat_id]);
                if (suratRows.length > 0) {
                    const proposerId = suratRows[0].created_by;
                    const perihal = suratRows[0].perihal;
                    await notificationService.send(
                        proposerId,
                        'Pengajuan Surat Ditolak',
                        `Pengajuan surat "${perihal}" telah ditolak oleh ${req.user.nama_lengkap}. Alasan: ${reason || 'Tidak ada alasan spesifik.'}`,
                        'SURAT_REJECTED',
                        `manajemen-surat`
                    );
                }
            }
        }

        // IMPORTANT: Update the specific approval record
        await connection.query('UPDATE surat_approvals SET status = ?, reason = ?, signed_at = NOW() WHERE id = ?', [action, reason || null, id]);

        // Record history for any action
        await connection.query(
            'INSERT INTO surat_edit_history (surat_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
            [approval.surat_id, req.user.id, action.toLowerCase(), `Status surat diubah menjadi ${action} oleh ${req.user.nama_lengkap}${reason ? ': ' + reason : ''}`]
        );

        await connection.commit();

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: `APPROVAL_${action}`,
            table_name: 'surat',
            record_id: approval.surat_id,
            new_values: { approval_id: id, reason: reason || null },
            req: req
        });

        res.status(200).json({ success: true, message: `Berhasil memproses dokumen: ${action}` });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error in processAction:', error);
        res.status(500).json({ success: false, message: 'Gagal memproses persetujuan' });
    } finally {
        if (connection) connection.release();
    }
};

exports.uploadFinal = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // surat_id
        const { dokumen_id } = req.body;
        
        // 1. Fetch current content to lock hash and check nomor
        const [rows] = await connection.query('SELECT isi_surat, nomor_surat FROM surat WHERE id = ?', [id]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Surat tidak ditemukan' });
        }
        
        const content = rows[0].isi_surat;
        const hash = generateHash(content);
        const currentNomor = rows[0].nomor_surat;
        const finalNomor = currentNomor === 'DRAFT' ? '-' : currentNomor;

        // 2. Update main status to APPROVED + lock hash + cleanup nomor
        await connection.query(
            'UPDATE surat SET dokumen_id = ?, approval_status = "APPROVED", integrity_hash = ?, nomor_surat = ? WHERE id = ?', 
            [dokumen_id, hash, finalNomor, id]
        );
        
        // 3. Mark all remaining PENDING approval stages as APPROVED (for the manual hybrid flow)
        await connection.query(
            "UPDATE surat_approvals SET status = 'APPROVED', signed_at = NOW(), reason = COALESCE(reason, '[SINKRONISASI FISIK] Dokumen telah disahkan secara manual dan diunggah ke sistem.') WHERE surat_id = ? AND status = 'PENDING'", 
            [id]
        );
        
        // Use a shared connection for integration if possible, but integrateLeaveToLogbook uses pool.query internally.
        // For simplicity, we'll keep it as is, but ideally it should use the transaction connection.
        await integrateLeaveToLogbook(id);
        
        await connection.commit();
        
        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'UPLOAD_FINAL_SURAT',
            table_name: 'surat',
            record_id: id,
            new_values: { dokumen_id, status: 'APPROVED', hash_locked: true },
            req: req
        });

        res.status(200).json({ success: true, message: 'Dokumen fisik final berhasil diunggah dan diverifikasi' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error in uploadFinal:', error);
        res.status(500).json({ success: false, message: 'Gagal menautkan dokumen final' });
    } finally {
        if (connection) connection.release();
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { surat_id } = req.params;
        const query = `
            SELECT sa.*, pp.nama_lengkap as approver_name, j.jabatan as jabatan_name
            FROM surat_approvals sa
            JOIN users u ON sa.approver_id = u.id
            JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
            WHERE sa.surat_id = ?
            ORDER BY sa.urutan DESC
        `;
        const [rows] = await pool.query(query, [surat_id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error in getHistory:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};

exports.verifyDocument = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const query = `
            SELECT s.id, s.nomor_surat, s.perihal, s.tanggal_surat, s.approval_status, s.isi_surat, s.integrity_hash,
                   pp_pembuat.nama_lengkap as pembuat_nama,
                   COALESCE(
                       (
                           SELECT JSON_ARRAYAGG(JSON_OBJECT(
                               'role', sa.role, 
                               'status', sa.status, 
                               'approver_name', pp.nama_lengkap,
                               'jabatan', mj.jabatan,
                               'nip', pp.nip,
                               'signed_at', sa.signed_at
                           ))
                           FROM surat_approvals sa
                           JOIN users u ON sa.approver_id = u.id
                           JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                           LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
                           WHERE sa.surat_id = s.id
                           ORDER BY sa.urutan DESC
                       ), 
                       JSON_ARRAY()
                   ) as signers
            FROM surat s
            LEFT JOIN users u_pembuat ON s.created_by = u_pembuat.id
            LEFT JOIN profil_pegawai pp_pembuat ON u_pembuat.profil_pegawai_id = pp_pembuat.id
            WHERE s.verification_slug = ?
        `;
        
        const [rows] = await pool.query(query, [slug]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan atau kode verifikasi tidak valid.' });
        }

        const doc = rows[0];
        
        // Determine final status display
        const finalStatus = doc.is_deleted ? 'VOIDED' : doc.approval_status;
        const statusMessage = doc.is_deleted 
            ? 'DOKUMEN INI TELAH DIBATALKAN / DITARIK' 
            : 'DOKUMEN TERVERIFIKASI. Dokumen ini telah terdaftar secara resmi di sistem.';

        // Verify Integrity Hash
        const currentHash = generateHash(doc.isi_surat);
        const isValid = currentHash === doc.integrity_hash;

        // Ensure signers is an array (MySQL might return it as a string)
        let signers = doc.signers;
        if (typeof signers === 'string') {
            try {
                signers = JSON.parse(signers);
            } catch (e) {
                signers = [];
            }
        }

        res.json({
            success: true,
            data: {
                id: doc.id,
                nomor_surat: doc.nomor_surat,
                perihal: doc.perihal,
                tanggal_surat: doc.tanggal_surat,
                status: finalStatus,
                status_message: statusMessage,
                is_deleted: !!doc.is_deleted,
                pembuat: doc.pembuat_nama,
                is_integrity_valid: isValid,
                signers: signers || []
            }
        });
    } catch (error) {
        console.error('Error in verifyDocument:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memverifikasi dokumen.' });
    }
};

exports.bypassApproval = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // ID of surat_approvals row
        const { reason } = req.body;
        const user_id = req.user.id;
        const user_role = req.user.tipe_user_id;

        // 1. Get the approval stage and surat details
        const [rows] = await connection.query(`
            SELECT sa.*, s.bidang_id, s.instansi_id 
            FROM surat_approvals sa 
            JOIN surat s ON sa.surat_id = s.id 
            WHERE sa.id = ?
        `, [id]);
        
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Data persetujuan tidak ditemukan.' });
        }
        const approval = rows[0];

        // 2. Authorization Check: Superadmin (1) OR Admin (2/3) in same bidang
        const isSuperAdmin = user_role === 1;
        const isAdminBidang = (user_role === 2 || user_role === 3) && approval.bidang_id === req.user.bidang_id;
        
        if (!isSuperAdmin && !isAdminBidang) {
            await connection.rollback();
            return res.status(403).json({ 
                success: false, 
                message: 'Anda tidak memiliki otoritas untuk melewati tahap persetujuan di bidang ini.' 
            });
        }
        if (approval.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Hanya tahap yang berstatus PENDING yang bisa dilewati.' });
        }

        // 3. Update status to BYPASSED
        await connection.query('UPDATE surat_approvals SET status = "BYPASSED", reason = ?, signed_at = NOW() WHERE id = ?', 
            [`[BYPASS ADMIN] ${reason || 'Pejabat berhalangan/sakit'}`, id]);

        // 4. Check if we need to finalize the entire document
        const [pending] = await connection.query('SELECT id FROM surat_approvals WHERE surat_id = ? AND status = "PENDING"', [approval.surat_id]);
        
        if (pending.length === 0) {
            const slug = generateSlug();
            const [finalSurat] = await connection.query('SELECT isi_surat FROM surat WHERE id = ?', [approval.surat_id]);
            let content = finalSurat[0].isi_surat;
            
            // Enterprise-grade frontend resolution
            const protocol = req.get('x-forwarded-proto') || req.protocol;
            const host = req.get('x-forwarded-host') || req.get('host');

            // Smart Fallback for IP/Local access
            let smartHost = host;
            if (host.includes(':5001')) smartHost = host.replace(':5001', ':3000');
            else if (host.includes(':5000')) smartHost = host.replace(':5000', ':3000');

            const frontendBase = getLanAwareUrl(
                process.env.DASHBOARD_PUBLIC_URL || process.env.FRONTEND_URL || `${protocol}://${smartHost.replace('api-', '')}`
            );

            const hash = generateHash(content);
            await connection.query(
                'UPDATE surat SET approval_status = "APPROVED", isi_surat = ?, verification_slug = ?, integrity_hash = ? WHERE id = ?', 
                [content, slug, hash, approval.surat_id]
            );
            await integrateLeaveToLogbook(approval.surat_id);
        }

        await connection.commit();

        // 5. Audit Log (Out of transaction as it's separate)
        await auditService.log({
            user_id: user_id,
            action: 'BYPASS_APPROVAL',
            table_name: 'surat_approvals',
            record_id: id,
            old_values: approval,
            new_values: { status: 'BYPASSED', reason: reason },
            req: req
        });

        res.json({ success: true, message: 'Tahap persetujuan berhasil dilompati.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error in bypassApproval:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.integrateLeaveToLogbook = integrateLeaveToLogbook;

const removeLeaveFromLogbook = async (surat_id) => {
    try {
        const [surat] = await pool.query('SELECT employee_id, tanggal_acara, tanggal_akhir, tanggal_surat FROM surat WHERE id = ?', [surat_id]);
        if (surat.length > 0) {
            const sData = surat[0];
            if (sData.employee_id) {
                const startStr = sData.tanggal_acara ? new Date(sData.tanggal_acara).toISOString().split('T')[0] : null;
                const endStr = sData.tanggal_akhir ? new Date(sData.tanggal_akhir).toISOString().split('T')[0] : (startStr || new Date(sData.tanggal_surat).toISOString().split('T')[0]);
                const finalStartStr = startStr || endStr;

                if (finalStartStr) {
                    const dates = [];
                    let current = new Date(finalStartStr);
                    const end = new Date(endStr);
                    while (current <= end) {
                        dates.push(current.toISOString().split('T')[0]);
                        current.setDate(current.getDate() + 1);
                    }

                    // Delete Cuti logbook entries for this user on these dates
                    await pool.query(
                        `DELETE FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? AND tanggal IN (?) AND tipe_kegiatan = 'C'`,
                        [sData.employee_id, dates]
                    );
                }
            }
        }
    } catch (error) {
        console.error('Error in removeLeaveFromLogbook:', error);
    }
};

exports.removeLeaveFromLogbook = removeLeaveFromLogbook;
