const pool = require('../../../config/db');

const suratGlobalSettingsController = {
    getGlobalSettings: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            
            // Handle instansi specific settings, fallback to global settings (instansi_id IS NULL)
            const [rows] = await pool.query(
                'SELECT * FROM surat_global_settings WHERE instansi_id = ? OR instansi_id IS NULL ORDER BY instansi_id DESC, id DESC LIMIT 1',
                [instansi_id]
            );

            if (rows.length === 0) {
                // If not found, return default values
                return res.json({
                    success: true,
                    data: {
                        font_family: 'Arial',
                        font_size: 12,
                        line_height: 1.5,
                        text_align: 'justify',
                        paper_size: 'A4',
                        margin_top: 20,
                        margin_bottom: 20,
                        margin_left: 30,
                        margin_right: 20,
                        paragraph_spacing_before: 0,
                        paragraph_spacing_after: 0,
                        first_line_indent: 0
                    }
                });
            }

            res.json({ success: true, data: rows[0] });
        } catch (err) {
            console.error('Error fetching global letter settings:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    updateGlobalSettings: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            const {
                font_family, font_size, line_height, text_align, paper_size,
                margin_top, margin_bottom, margin_left, margin_right,
                paragraph_spacing_before, paragraph_spacing_after, first_line_indent
            } = req.body;

            // Check if settings exist for this instansi
            const [existing] = await pool.query(
                'SELECT id FROM surat_global_settings WHERE (instansi_id = ? OR (? IS NULL AND instansi_id IS NULL))',
                [instansi_id, instansi_id]
            );
            
            if (existing.length > 0) {
                // Update
                await pool.query(`
                    UPDATE surat_global_settings SET
                    font_family = ?, font_size = ?, line_height = ?, text_align = ?, paper_size = ?, 
                    margin_top = ?, margin_bottom = ?, margin_left = ?, margin_right = ?,
                    paragraph_spacing_before = ?, paragraph_spacing_after = ?, first_line_indent = ?
                    WHERE id = ?
                `, [
                    font_family, font_size, line_height, text_align, paper_size,
                    margin_top, margin_bottom, margin_left, margin_right,
                    paragraph_spacing_before, paragraph_spacing_after, first_line_indent,
                    existing[0].id
                ]);
            } else {
                // Insert
                await pool.query(`
                    INSERT INTO surat_global_settings 
                    (instansi_id, font_family, font_size, line_height, text_align, paper_size, 
                     margin_top, margin_bottom, margin_left, margin_right,
                     paragraph_spacing_before, paragraph_spacing_after, first_line_indent)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    instansi_id, font_family, font_size, line_height, text_align, paper_size,
                    margin_top, margin_bottom, margin_left, margin_right,
                    paragraph_spacing_before, paragraph_spacing_after, first_line_indent
                ]);
            }

            res.json({ success: true, message: 'Pengaturan global berhasil disimpan' });
        } catch (err) {
            console.error('Error updating global letter settings:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = suratGlobalSettingsController;
