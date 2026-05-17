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
            const [rows] = await pool.query('SELECT id, email, jenis_ai, label, api_key, is_active, created_at FROM gemini_api_keys ORDER BY created_at DESC');
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
            const { label, api_key, is_active, email, jenis_ai } = req.body;
            if (!label || !api_key) {
                return res.status(400).json({ success: false, message: 'Label dan API Key harus diisi' });
            }

            // If this is set to active and is Gemini Free, deactivate others of SAME TYPE (Free)
            // But actually, we usually want multiple Free keys active for rotation.
            // Let's only deactivate if it's not 'Gemini Free' or based on user's previous preference.
            // Actually, keep it simple: if user explicitly sets is_active, just do it.

            await pool.query(
                'INSERT INTO gemini_api_keys (label, api_key, is_active, email, jenis_ai) VALUES (?, ?, ?, ?, ?)',
                [label, api_key, is_active ? 1 : 0, email || null, jenis_ai || 'Gemini Free']
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
            const { label, api_key, is_active, email, jenis_ai } = req.body;

            if (!label) {
                return res.status(400).json({ success: false, message: 'Label tidak boleh kosong' });
            }

            const updates = ['label = ?', 'is_active = ?', 'email = ?', 'jenis_ai = ?'];
            const params = [label, is_active ? 1 : 0, email || null, jenis_ai || 'Gemini Free'];

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
    },

    // AI Monitor: Get Stats (Top Spenders)
    getAiUsageStats: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    u.username as Username,
                    COUNT(h.id) as Total_Chat,
                    SUM(CASE WHEN h.content LIKE '%[FILE:%' THEN 1 ELSE 0 END) as Total_Analisis_Dokumen,
                    SUM(LENGTH(h.content)) as Estimasi_Panjang_Karakter
                FROM nayaxa_chat_history h
                LEFT JOIN users u ON h.user_id = u.id
                WHERE h.role = 'user'
                GROUP BY h.user_id, u.username
                ORDER BY Total_Analisis_Dokumen DESC, Total_Chat DESC
                LIMIT 50
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching AI Stats:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil statistik penggunaan AI' });
        }
    },

    // AI Monitor: Get History
    getAiUsageHistory: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    h.id,
                    h.created_at as Waktu,
                    u.username as User,
                    h.brain_used as Brain,
                    h.content as Pesan
                FROM nayaxa_chat_history h
                LEFT JOIN users u ON h.user_id = u.id
                WHERE h.role = 'user'
                ORDER BY h.created_at DESC
                LIMIT 100
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching AI History:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil riwayat penggunaan AI' });
        }
    },

    // Widget Prompts Management
    getWidgetPrompts: async (req, res) => {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS nayaxa_widget_prompts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    label VARCHAR(255) NOT NULL,
                    prompt TEXT NOT NULL,
                    urutan INT DEFAULT 0,
                    is_active TINYINT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            // Auto-migration to ensure existing table prompt column is altered from VARCHAR(255) to TEXT
            try {
                await pool.query('ALTER TABLE nayaxa_widget_prompts MODIFY COLUMN prompt TEXT NOT NULL;');
            } catch (alterErr) {
                // Column might already be TEXT or other minor warning, safely continue
            }

            const [rows] = await pool.query('SELECT * FROM nayaxa_widget_prompts ORDER BY urutan ASC, id ASC');
            if (rows.length === 0) {
                await pool.query(`
                    INSERT INTO nayaxa_widget_prompts (label, prompt, urutan) VALUES 
                    ('Analisis', 'Analisis', 1),
                    ('Jadikan Acuan Bahan', 'Jadikan Acuan Bahan', 2),
                    ('Jadikan Acuan Format', 'Jadikan Acuan Format', 3),
                    ('Buatkan Ringkasan', 'Buatkan Ringkasan', 4),
                    ('Ringkasan+Notulen', 'Buatkan Ringkasan+Notulen', 5),
                    ('Ringkasan+Notulen+Word', 'Buatkan Ringkasan+Notulen+Word', 6);
                `);
                const [newRows] = await pool.query('SELECT * FROM nayaxa_widget_prompts ORDER BY urutan ASC, id ASC');
                return res.json({ success: true, data: newRows });
            }

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching Widget Prompts:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar prompt widget' });
        }
    },

    addWidgetPrompt: async (req, res) => {
        try {
            const { label, prompt, urutan } = req.body;
            if (!label || !prompt) {
                return res.status(400).json({ success: false, message: 'Label dan Prompt wajib diisi' });
            }

            await pool.query(
                'INSERT INTO nayaxa_widget_prompts (label, prompt, urutan) VALUES (?, ?, ?)',
                [label, prompt, urutan || 0]
            );

            res.json({ success: true, message: 'Prompt widget berhasil ditambahkan' });
        } catch (error) {
            console.error('Error adding Widget Prompt:', error);
            res.status(500).json({ success: false, message: 'Gagal menambahkan prompt widget' });
        }
    },

    updateWidgetPrompt: async (req, res) => {
        try {
            const { id } = req.params;
            const { label, prompt, urutan, is_active } = req.body;

            if (!label || !prompt) {
                return res.status(400).json({ success: false, message: 'Label dan Prompt wajib diisi' });
            }

            await pool.query(
                'UPDATE nayaxa_widget_prompts SET label = ?, prompt = ?, urutan = ?, is_active = ? WHERE id = ?',
                [label, prompt, urutan || 0, is_active !== undefined ? is_active : 1, id]
            );

            res.json({ success: true, message: 'Prompt widget berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating Widget Prompt:', error);
            res.status(500).json({ success: false, message: 'Gagal memperbarui prompt widget' });
        }
    },

    deleteWidgetPrompt: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM nayaxa_widget_prompts WHERE id = ?', [id]);
            res.json({ success: true, message: 'Prompt widget berhasil dihapus' });
        } catch (error) {
            console.error('Error deleting Widget Prompt:', error);
            res.status(500).json({ success: false, message: 'Gagal menghapus prompt widget' });
        }
    },

    reorderWidgetPrompts: async (req, res) => {
        try {
            const { items } = req.body; // [{ id, urutan }, ...]
            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ success: false, message: 'Items array wajib diisi' });
            }
            for (const item of items) {
                await pool.query('UPDATE nayaxa_widget_prompts SET urutan = ? WHERE id = ?', [item.urutan, item.id]);
            }
            res.json({ success: true, message: 'Urutan prompt berhasil diperbarui' });
        } catch (error) {
            console.error('Error reordering Widget Prompts:', error);
            res.status(500).json({ success: false, message: 'Gagal memperbarui urutan prompt widget' });
        }
    }
};

module.exports = pengaturanController;


