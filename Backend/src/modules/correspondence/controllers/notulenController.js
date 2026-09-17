const pool = require('../../../config/db');
const { generateSlug } = require('../../../utils/cryptoUtils');

const notulenController = {
    create: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { 
                kegiatan_id, template_id, nomor_notulen, perihal, 
                tanggal_notulen, isi_notulen, pimpinan_rapat_id, 
                butuh_kaban_approval, bidang_id
            } = req.body;
            
            const instansi_id = req.user.instansi_id;
            const slug = generateSlug();

            const [result] = await connection.query(
                `INSERT INTO notulen 
                (kegiatan_id, template_id, nomor_notulen, perihal, tanggal_notulen, isi_notulen, instansi_id, bidang_id, created_by, verification_slug) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [kegiatan_id || null, template_id, nomor_notulen, perihal, tanggal_notulen, isi_notulen, instansi_id, bidang_id || req.user.bidang_id, req.user.id, slug]
            );

            const notulenId = result.insertId;

            // 1. First Approver: The Notulis (the creator themselves)
            // In digital TTE, the creator usually signs first automatically or as the first step.
            await connection.query(
                'INSERT INTO notulen_approvals (notulen_id, approver_id, role, status, urutan, signed_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [notulenId, req.user.id, 'Notulis', 'APPROVED', 1]
            );

            // 2. Second Approver: Pimpinan Rapat
            if (pimpinan_rapat_id) {
                await connection.query(
                    'INSERT INTO notulen_approvals (notulen_id, approver_id, role, status, urutan) VALUES (?, ?, ?, ?, ?)',
                    [notulenId, pimpinan_rapat_id, 'Pimpinan Rapat', 'PENDING', 2]
                );
            }

            // 3. Optional Third Approver: Kaban
            if (butuh_kaban_approval) {
                // Find Kaban for this instansi
                const [kabanRows] = await connection.query(
                    'SELECT id FROM users WHERE instansi_id = ? AND tipe_user_id = 2 LIMIT 1', 
                    [instansi_id]
                );
                if (kabanRows.length > 0) {
                    await connection.query(
                        'INSERT INTO notulen_approvals (notulen_id, approver_id, role, status, urutan) VALUES (?, ?, ?, ?, ?)',
                        [notulenId, kabanRows[0].id, 'Kepala Badan', 'PENDING', 3]
                    );
                }
            }

            // History
            await connection.query(
                'INSERT INTO notulen_edit_history (notulen_id, user_id, aksi, keterangan) VALUES (?, ?, ?, ?)',
                [notulenId, req.user.id, 'create', 'Notulen rapat dibuat']
            );

            await connection.commit();
            res.status(201).json({ success: true, data: { id: notulenId, verification_slug: slug } });
        } catch (error) {
            await connection.rollback();
            console.error('Error creating notulen:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    },

    getAll: async (req, res) => {
        try {
            const { kegiatan_id, bidang_id } = req.query;
            const instansi_id = req.user.instansi_id;
            const isSuperAdmin = req.user.tipe_user_id === 1;

            let query = `
                SELECT n.*, k.nama_kegiatan, u.nama_lengkap as creator_name,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('role', sa.role, 'status', sa.status, 'approver_name', pp.nama_lengkap))
                 FROM notulen_approvals sa 
                 JOIN users u2 ON sa.approver_id = u2.id 
                 JOIN profil_pegawai pp ON u2.profil_pegawai_id = pp.id
                 WHERE sa.notulen_id = n.id ORDER BY sa.urutan) as approval_chain
                FROM notulen n
                LEFT JOIN kegiatan_manajemen k ON n.kegiatan_id = k.id
                JOIN users u_usr ON n.created_by = u_usr.id
                JOIN profil_pegawai u ON u_usr.profil_pegawai_id = u.id
                WHERE n.is_deleted = 0
            `;
            const params = [];

            if (!isSuperAdmin) {
                query += ' AND n.instansi_id = ?';
                params.push(instansi_id);
            }

            if (kegiatan_id) {
                query += ' AND n.kegiatan_id = ?';
                params.push(kegiatan_id);
            }

            if (bidang_id && bidang_id !== 'all') {
                query += ' AND n.bidang_id = ?';
                params.push(bidang_id);
            }

            query += ' ORDER BY n.created_at DESC';

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getById: async (req, res) => {
        try {
            const query = `
                SELECT n.*, nt.nama_template, nt.font_family, nt.font_size, nt.margin_top, nt.margin_bottom, nt.margin_left, nt.margin_right, nt.paper_size, nt.line_height, nt.text_align, nt.kop_line_style, nt.is_kop_surat_required, nt.logo_path, nt.use_global_settings
                FROM notulen n
                LEFT JOIN notulen_templates nt ON n.template_id = nt.id
                WHERE n.id = ?
            `;
            const [rows] = await pool.query(query, [req.params.id]);
            if (rows.length === 0) return res.status(404).json({ success: false, message: 'Notulen tidak ditemukan' });
            
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = notulenController;
