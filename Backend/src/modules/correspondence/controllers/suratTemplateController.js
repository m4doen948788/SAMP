const pool = require('../../../config/db');

const suratTemplateController = {
    getAll: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            const isSuperAdmin = req.user.tipe_user_id === 1;

            let query = 'SELECT * FROM surat_templates WHERE instansi_id IS NULL';
            const params = [];

            if (!isSuperAdmin) {
                query += ' OR instansi_id = ?';
                params.push(instansi_id);
            } else {
                query = 'SELECT * FROM surat_templates';
            }

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching letter templates:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getById: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM surat_templates WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error fetching letter template:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    create: async (req, res) => {
        try {
            const { 
                nama_jenis_surat, font_family, font_size, 
                margin_top, margin_bottom, margin_left, margin_right, 
                paper_size, isi_template, is_pegawai_required, is_nomor_surat_required, is_kop_surat_required, logo_path,
                has_tujuan, has_pembuka, has_identitas_pegawai, has_detail_cuti, has_penutup
            } = req.body;
            
            const instansi_id = req.user.instansi_id;

            const [result] = await pool.query(
                `INSERT INTO surat_templates 
                (nama_jenis_surat, font_family, font_size, margin_top, margin_bottom, margin_left, margin_right, paper_size, isi_template, is_pegawai_required, is_nomor_surat_required, is_kop_surat_required, logo_path, instansi_id, has_tujuan, has_pembuka, has_identitas_pegawai, has_detail_cuti, has_penutup) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nama_jenis_surat, font_family || 'Arial', font_size || 12, 
                    margin_top || 20, margin_bottom || 20, margin_left || 30, margin_right || 20, 
                    paper_size || 'A4', isi_template || null, is_pegawai_required ?? false, is_nomor_surat_required ?? true, is_kop_surat_required ?? true, logo_path || null, instansi_id,
                    has_tujuan ?? 0, has_pembuka ?? 0, has_identitas_pegawai ?? 0, has_detail_cuti ?? 0, has_penutup ?? 0
                ]
            );

            res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
        } catch (error) {
            console.error('Error creating letter template:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    update: async (req, res) => {
        try {
            const { 
                nama_jenis_surat, font_family, font_size, 
                margin_top, margin_bottom, margin_left, margin_right, 
                paper_size, isi_template, is_pegawai_required, is_nomor_surat_required, is_kop_surat_required, logo_path,
                has_tujuan, has_pembuka, has_identitas_pegawai, has_detail_cuti, has_penutup
            } = req.body;

            const [result] = await pool.query(
                `UPDATE surat_templates SET 
                nama_jenis_surat = ?, font_family = ?, font_size = ?, 
                margin_top = ?, margin_bottom = ?, margin_left = ?, margin_right = ?, 
                paper_size = ?, isi_template = ?, is_pegawai_required = ?, is_nomor_surat_required = ?, is_kop_surat_required = ?, logo_path = ?,
                has_tujuan = ?, has_pembuka = ?, has_identitas_pegawai = ?, has_detail_cuti = ?, has_penutup = ? 
                WHERE id = ?`,
                [
                    nama_jenis_surat, font_family, font_size, 
                    margin_top, margin_bottom, margin_left, margin_right, 
                    paper_size, isi_template, is_pegawai_required, is_nomor_surat_required, is_kop_surat_required, logo_path,
                    has_tujuan, has_pembuka, has_identitas_pegawai, has_detail_cuti, has_penutup,
                    req.params.id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
            }

            res.json({ success: true, message: 'Template berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating letter template:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    delete: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM surat_templates WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
            }
            res.json({ success: true, message: 'Template berhasil dihapus' });
        } catch (error) {
            console.error('Error deleting letter template:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = suratTemplateController;
