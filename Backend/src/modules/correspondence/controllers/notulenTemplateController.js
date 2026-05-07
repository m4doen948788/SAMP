const pool = require('../../../config/db');

const notulenTemplateController = {
    getAll: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            const isSuperAdmin = req.user.tipe_user_id === 1;

            let query = 'SELECT * FROM notulen_templates WHERE instansi_id IS NULL';
            const params = [];

            if (!isSuperAdmin) {
                query += ' OR instansi_id = ?';
                params.push(instansi_id);
            } else {
                query = 'SELECT * FROM notulen_templates';
            }

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching notulen templates:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getById: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM notulen_templates WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error fetching notulen template:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getGlobal: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM notulen_global_settings WHERE id = 1');
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateGlobal: async (req, res) => {
        try {
            const { 
                font_family, font_size, line_height, text_align, paper_size, 
                margin_top, margin_bottom, margin_left, margin_right,
                paragraph_spacing_before, paragraph_spacing_after, first_line_indent
            } = req.body;

            await pool.query(
                `UPDATE notulen_global_settings SET 
                font_family = ?, font_size = ?, line_height = ?, text_align = ?, paper_size = ?, 
                margin_top = ?, margin_bottom = ?, margin_left = ?, margin_right = ?,
                paragraph_spacing_before = ?, paragraph_spacing_after = ?, first_line_indent = ?
                WHERE id = 1`,
                [
                    font_family, font_size, line_height, text_align, paper_size, 
                    margin_top, margin_bottom, margin_left, margin_right,
                    paragraph_spacing_before, paragraph_spacing_after, first_line_indent
                ]
            );
            res.json({ success: true, message: 'Global settings updated' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const { 
                nama_template, font_family, font_size, 
                margin_top, margin_bottom, margin_left, margin_right, 
                paper_size, isi_template, is_kop_surat_required, logo_path,
                line_height, text_align, master_dokumen_id,
                kop_line_style, use_global_settings, 
                paragraph_spacing_before, paragraph_spacing_after, first_line_indent
            } = req.body;
            
            const instansi_id = req.user.instansi_id;

            const [result] = await pool.query(
                `INSERT INTO notulen_templates 
                (nama_template, font_family, font_size, margin_top, margin_bottom, margin_left, margin_right, paper_size, isi_template, is_kop_surat_required, logo_path, instansi_id, line_height, text_align, master_dokumen_id, kop_line_style, use_global_settings, paragraph_spacing_before, paragraph_spacing_after, first_line_indent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nama_template, font_family || 'Arial', font_size || 12, 
                    margin_top || 20, margin_bottom || 20, margin_left || 30, margin_right || 20, 
                    paper_size || 'A4', isi_template || null, is_kop_surat_required ?? true, logo_path || null, instansi_id,
                    line_height || 1.5, text_align || 'justify',
                    master_dokumen_id || null,
                    kop_line_style || 'double',
                    use_global_settings ?? 1,
                    paragraph_spacing_before || 0,
                    paragraph_spacing_after || 0,
                    first_line_indent || 0
                ]
            );

            res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
        } catch (error) {
            console.error('Error creating notulen template:', error);
            res.status(500).json({ success: false, message: 'Gagal membuat template: ' + error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { 
                nama_template, font_family, font_size, 
                margin_top, margin_bottom, margin_left, margin_right, 
                paper_size, isi_template, is_kop_surat_required, logo_path,
                line_height, text_align, master_dokumen_id,
                kop_line_style, use_global_settings, 
                paragraph_spacing_before, paragraph_spacing_after, first_line_indent
            } = req.body;

            const [result] = await pool.query(
                `UPDATE notulen_templates SET 
                nama_template = ?, font_family = ?, font_size = ?, 
                margin_top = ?, margin_bottom = ?, margin_left = ?, margin_right = ?, 
                paper_size = ?, isi_template = ?, is_kop_surat_required = ?, logo_path = ?,
                line_height = ?, text_align = ?, master_dokumen_id = ?,
                kop_line_style = ?, use_global_settings = ?, 
                paragraph_spacing_before = ?, paragraph_spacing_after = ?, first_line_indent = ?
                WHERE id = ?`,
                [
                    nama_template, font_family, font_size, 
                    margin_top, margin_bottom, margin_left, margin_right, 
                    paper_size, isi_template, is_kop_surat_required, logo_path,
                    line_height, text_align, master_dokumen_id || null,
                    kop_line_style || 'double',
                    use_global_settings ?? 1,
                    paragraph_spacing_before || 0,
                    paragraph_spacing_after || 0,
                    first_line_indent || 0,
                    req.params.id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
            }

            res.json({ success: true, message: 'Template berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating notulen template:', error);
            res.status(500).json({ success: false, message: 'Gagal memperbarui template: ' + error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM notulen_templates WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
            }
            res.json({ success: true, message: 'Template berhasil dihapus' });
        } catch (error) {
            console.error('Error deleting notulen template:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = notulenTemplateController;
