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
            session_id, base_url
        } = req.body;

        try {
            // In Lite version, we don't strictly require session history for the first few turns to work
            const history = []; // Simplified for now

            const response = await nayaxaGemini.chat(message, history, {
                user_name: user_name || 'User',
                instansi_nama: instansi_nama || 'Bapperida',
                base_url: base_url || ''
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
            const exportDir = path.join(__dirname, '../../uploads/exports');
            const filePath = path.join(exportDir, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).send('File not found.');
            }

            res.download(filePath, filename);
        } catch (error) {
            console.error('Download Export Error:', error);
            res.status(500).send('Internal Server Error.');
        }
    }
};

module.exports = nayaxaController;
