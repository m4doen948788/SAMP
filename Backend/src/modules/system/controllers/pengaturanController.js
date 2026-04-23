const pool = require('../../../config/db');

const censorKey = (val) => {
    if (!val) return '';
    if (val.length > 10) {
        return val.substring(0, 6) + '...' + val.substring(val.length - 4);
    }
    return '********';
};

const pengaturanController = {
    // List all Gemini API Keys
    getGeminiKeys: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT id, label, api_key, is_active, created_at FROM gemini_api_keys ORDER BY created_at DESC');
            const data = rows.map(row => ({
                ...row,
                api_key: censorKey(row.api_key)
            }));
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching Gemini Keys:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar API Key' });
        }
    },

    // Add new Gemini API Key
    addGeminiKey: async (req, res) => {
        try {
            const { label, api_key, is_active } = req.body;
            if (!label || !api_key) {
                return res.status(400).json({ success: false, message: 'Label dan API Key harus diisi' });
            }

            // If this is set to active, deactivate others
            if (is_active) {
                await pool.query('UPDATE gemini_api_keys SET is_active = 0');
            }

            await pool.query(
                'INSERT INTO gemini_api_keys (label, api_key, is_active) VALUES (?, ?, ?)',
                [label, api_key, is_active ? 1 : 0]
            );

            res.json({ success: true, message: 'API Key berhasil ditambahkan' });
        } catch (error) {
            console.error('Error adding Gemini Key:', error);
            res.status(500).json({ success: false, message: 'Gagal menambahkan API Key' });
        }
    },

    // Update Gemini API Key
    updateGeminiKey: async (req, res) => {
        try {
            const { id } = req.params;
            const { label, api_key, is_active } = req.body;

            if (!label) {
                return res.status(400).json({ success: false, message: 'Label tidak boleh kosong' });
            }

            // If is_active changed to 1, deactivate others
            if (is_active) {
                await pool.query('UPDATE gemini_api_keys SET is_active = 0');
            }

            const updates = ['label = ?', 'is_active = ?'];
            const params = [label, is_active ? 1 : 0];

            if (api_key) {
                updates.push('api_key = ?');
                params.push(api_key);
            }

            params.push(id);
            await pool.query(`UPDATE gemini_api_keys SET ${updates.join(', ')} WHERE id = ?`, params);

            res.json({ success: true, message: 'API Key berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating Gemini Key:', error);
            res.status(500).json({ success: false, message: 'Gagal memperbarui API Key' });
        }
    },

    // Delete Gemini API Key
    deleteGeminiKey: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM gemini_api_keys WHERE id = ?', [id]);
            res.json({ success: true, message: 'API Key berhasil dihapus' });
        } catch (error) {
            console.error('Error deleting Gemini Key:', error);
            res.status(500).json({ success: false, message: 'Gagal menghapus API Key' });
        }
    },

    // Activate Gemini API Key
    activateGeminiKey: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('UPDATE gemini_api_keys SET is_active = 0');
            await pool.query('UPDATE gemini_api_keys SET is_active = 1 WHERE id = ?', [id]);
            res.json({ success: true, message: 'API Key berhasil diaktifkan' });
        } catch (error) {
            console.error('Error activating Gemini Key:', error);
            res.status(500).json({ success: false, message: 'Gagal mengaktifkan API Key' });
        }
    }
};

module.exports = pengaturanController;
