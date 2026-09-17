const pool = require('../../../config/db');

const themeController = {
    // Get global theme settings
    getSettings: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT pengaturan_key, pengaturan_value FROM pengaturan_aplikasi WHERE pengaturan_key IN ("theme_mode", "admin_theme", "admin_custom_colors")');

            const settings = {};
            rows.forEach(row => {
                settings[row.pengaturan_key] = row.pengaturan_value;
            });

            // Parse JSON for custom colors
            if (settings.admin_custom_colors) {
                try {
                    settings.admin_custom_colors = JSON.parse(settings.admin_custom_colors);
                } catch (e) {
                    settings.admin_custom_colors = { primary: '#0f172a', secondary: '#1e293b' };
                }
            }

            res.json({ success: true, data: settings });
        } catch (error) {
            console.error('Error fetching theme settings:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch theme settings' });
        }
    },

    // Update global theme settings (Superadmin only)
    updateGlobalSettings: async (req, res) => {
        try {
            const { theme_mode, admin_theme, admin_custom_colors } = req.body;

            if (theme_mode) {
                await pool.query('INSERT INTO pengaturan_aplikasi (pengaturan_key, pengaturan_value) VALUES ("theme_mode", ?) ON DUPLICATE KEY UPDATE pengaturan_value = VALUES(pengaturan_value)', [theme_mode]);
            }

            if (admin_theme) {
                await pool.query('INSERT INTO pengaturan_aplikasi (pengaturan_key, pengaturan_value) VALUES ("admin_theme", ?) ON DUPLICATE KEY UPDATE pengaturan_value = VALUES(pengaturan_value)', [admin_theme]);
            }

            if (admin_custom_colors) {
                const colorsStr = typeof admin_custom_colors === 'string' ? admin_custom_colors : JSON.stringify(admin_custom_colors);
                await pool.query('INSERT INTO pengaturan_aplikasi (pengaturan_key, pengaturan_value) VALUES ("admin_custom_colors", ?) ON DUPLICATE KEY UPDATE pengaturan_value = VALUES(pengaturan_value)', [colorsStr]);
            }

            res.json({ success: true, message: 'Global theme settings updated successfully' });
        } catch (error) {
            console.error('Error updating global theme settings:', error);
            res.status(500).json({ success: false, message: 'Failed to update global theme settings' });
        }
    },

    // Update individual user theme
    updateUserTheme: async (req, res) => {
        try {
            const userId = req.user.id;
            const { tema, tema_custom_colors } = req.body;

            const updates = [];
            const values = [];

            if (tema !== undefined) {
                updates.push('tema = ?');
                values.push(tema);
            }

            if (tema_custom_colors !== undefined) {
                updates.push('tema_custom_colors = ?');
                values.push(typeof tema_custom_colors === 'string' ? tema_custom_colors : JSON.stringify(tema_custom_colors));
            }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No theme data provided' });
            }

            // Get profil_pegawai_id from users
            const [userRow] = await pool.query('SELECT profil_pegawai_id FROM users WHERE id = ?', [userId]);
            if (userRow.length === 0 || !userRow[0].profil_pegawai_id) {
                return res.status(404).json({ success: false, message: 'User profile not found' });
            }

            values.push(userRow[0].profil_pegawai_id);
            await pool.query(`UPDATE profil_pegawai SET ${updates.join(', ')} WHERE id = ?`, values);

            res.json({ success: true, message: 'User theme updated successfully' });
        } catch (error) {
            console.error('Error updating user theme:', error);
            res.status(500).json({ success: false, message: 'Failed to update user theme' });
        }
    }
};

module.exports = themeController;
