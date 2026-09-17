const pool = require('../../../config/db');

const appSettingController = {
    // Get all settings (filtered for public/private if needed, but for now specific)
    getAll: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT setting_key, setting_value, description FROM app_settings');
            const data = {};
            rows.forEach(row => {
                data[row.setting_key] = row.setting_value;
            });
            res.json({ success: true, data, raw: rows });
        } catch (error) {
            console.error('Error fetching app settings:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan aplikasi' });
        }
    },

    // Get specific setting
    getByKey: async (req, res) => {
        try {
            const { key } = req.params;
            const [rows] = await pool.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Pengaturan tidak ditemukan' });
            }
            res.json({ success: true, data: rows[0].setting_value });
        } catch (error) {
            console.error('Error fetching app setting:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan' });
        }
    },

    // Update specific setting
    update: async (req, res) => {
        try {
            const { key } = req.params;
            const { value } = req.body;

            const [result] = await pool.query(
                'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?',
                [value, key]
            );

            if (result.affectedRows === 0) {
                // If it doesn't exist, maybe create it? For now, just return error
                return res.status(404).json({ success: false, message: 'Pengaturan tidak ditemukan' });
            }

            res.json({ success: true, message: 'Pengaturan berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating app setting:', error);
            res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan' });
        }
    }
};

module.exports = appSettingController;
