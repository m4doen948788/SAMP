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
            session_id, base_url: provided_base_url,
            persona: provided_persona
        } = req.body;

        try {
            // Trigger document indexing (RAG sync) in the background so new documents are immediately readable
            const nayaxaStandalone = require('../services/nayaxaStandalone');
            nayaxaStandalone.indexLibrary().catch(err => {
                console.error('[Background Indexing Error] Failed to index uploaded files:', err.message);
            });

            // Enterprise-grade baseUrl resolution
            const protocol = req.get('x-forwarded-proto') || req.protocol;
            const host = req.get('x-forwarded-host') || req.get('host') || '';
            const origin = req.get('origin') || '';
            const referer = req.get('referer') || '';
            const baseUrl = provided_base_url || process.env.NAYAXA_PUBLIC_URL || `${protocol}://${host}`;

            const isNayaxa = host.includes('nayaxa.my.id') || origin.includes('nayaxa.my.id') || referer.includes('nayaxa.my.id') || (provided_base_url && provided_base_url.includes('nayaxa.my.id'));
            const persona = provided_persona || (isNayaxa ? 'nayaxa' : 'bapperida');

            // In Lite version, we don't strictly require session history for the first few turns to work
            const history = []; // Simplified for now

            const response = await nayaxaGemini.chat(message, history, {
                user_name: user_name || 'User',
                instansi_nama: instansi_nama || 'Bapperida',
                base_url: baseUrl,
                persona: persona
            });

            let responseText = response.text;
            if (persona === 'bapperida' && responseText) {
                responseText = responseText.replace(/Nayaxa/gi, 'Bapperida AI');
            }

            res.json({
                success: true,
                text: responseText,
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


    getWaStatus: async (req, res) => {
        try {
            const whatsappService = require('../../../services/whatsappService');
            const status = await whatsappService.getStatus();
            res.json({ success: true, ...status });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    logoutWa: async (req, res) => {
        try {
            const whatsappService = require('../../../services/whatsappService');
            const status = await whatsappService.logoutSession();
            res.json({ success: true, ...status });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    sendWaMessage: async (req, res) => {
        try {
            const { to, text } = req.body;
            const whatsappService = require('../../../services/whatsappService');
            const result = await whatsappService.sendMessage(to, text);
            res.json({ success: true, result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = nayaxaController;

