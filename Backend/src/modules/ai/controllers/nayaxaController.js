const nayaxaGemini = require('../services/nayaxaGeminiService');
const fs = require('fs');
const path = require('path');

/**
 * Nayaxa Controller (v4.5.5 Lite)
 * Minimal implementation for copy-dashboard to support PPTX and Workstation.
 */
const nayaxaController = {
    /**
     * Core Chat Endpoint
     */
    chat: async (req, res) => {
        const { 
            message,
            user_id, user_name, instansi_nama,
            session_id, base_url: provided_base_url
        } = req.body;

        try {
            // Enterprise-grade baseUrl resolution
            const protocol = req.get('x-forwarded-proto') || req.protocol;
            const host = req.get('x-forwarded-host') || req.get('host');
            const baseUrl = provided_base_url || process.env.NAYAXA_PUBLIC_URL || `${protocol}://${host}`;

            // In Lite version, we don't strictly require session history for the first few turns to work
            const history = []; // Simplified for now

            const response = await nayaxaGemini.chat(message, history, {
                user_name: user_name || 'User',
                instansi_nama: instansi_nama || 'Bapperida',
                base_url: baseUrl
            });

            res.json({
                success: true,
                text: response.text,
                session_id: session_id || `sess_${Date.now()}`
            });
        } catch (error) {
            console.error('Nayaxa Chat Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Download Endpoint for Exports
     */
    downloadExport: (req, res) => {
        try {
            const { filename } = req.params;
            const exportDir = path.join(__dirname, '../../../../uploads/exports');
            const filePath = path.join(exportDir, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).send('File not found.');
            }

            res.download(filePath, filename);
        } catch (error) {
            console.error('Download Export Error:', error);
            res.status(500).send('Internal Server Error.');
        }
    },

    /**
     * Secret Chat Table creation
     */
    ensureSecretTable: async () => {
        const pool = require('../../../config/db');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS nayaxa_secret_chat (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createTableQuery);
    },

    /**
     * Get Secret Chat history (auto-pruned to last 3 hours)
     */
    getSecretHistory: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        try {
            const pool = require('../../../config/db');
            await nayaxaController.ensureSecretTable();

            // Prune messages older than 3 hours
            await pool.query(`DELETE FROM nayaxa_secret_chat WHERE created_at < NOW() - INTERVAL 3 HOUR`);

            // Retrieve non-expired messages
            const [rows] = await pool.query(
                `SELECT sender, message, created_at FROM nayaxa_secret_chat ORDER BY created_at ASC`
            );

            res.json({
                success: true,
                messages: rows
            });
        } catch (error) {
            console.error('Secret Chat History Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    /**
     * Send Secret Chat Message
     */
    sendSecretMessage: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        try {
            const pool = require('../../../config/db');
            await nayaxaController.ensureSecretTable();

            // Prune expired messages
            await pool.query(`DELETE FROM nayaxa_secret_chat WHERE created_at < NOW() - INTERVAL 3 HOUR`);

            // Insert new message
            await pool.query(
                `INSERT INTO nayaxa_secret_chat (sender, message) VALUES (?, ?)`,
                [username, message.trim()]
            );

            res.json({
                success: true
            });
        } catch (error) {
            console.error('Secret Chat Send Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
};

module.exports = nayaxaController;
