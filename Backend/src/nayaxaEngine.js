require('dotenv').config();
const express = require('express');
const cors = require('cors');
let nayaxaGeminiService;
try {
    nayaxaGeminiService = require('./modules/ai/services/nayaxaGeminiService');
} catch (e) {
    nayaxaGeminiService = require('./services/nayaxaGeminiService');
}

const app = express();
const PORT = 6001;
const API_KEY = process.env.NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Security Middleware (x-api-key check)
 */
const authenticate = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ success: false, message: "Unauthorized API Access" });
    }
    next();
};

/**
 * [POST] /chat
 * Primary endpoint for AI conversation
 */
app.post('/chat', authenticate, async (req, res) => {
    const { message, history, user_name, instansi_nama, base_url, persona: provided_persona } = req.body;
    
    try {
        const host = req.get('host') || '';
        const origin = req.get('origin') || '';
        const isNayaxa = host.includes('nayaxa.my.id') || origin.includes('nayaxa.my.id') || (base_url && base_url.includes('nayaxa.my.id'));
        const persona = provided_persona || (isNayaxa ? 'nayaxa' : 'bapperida');

        const response = await nayaxaGeminiService.chat(message, history || [], {
            user_name,
            instansi_nama,
            base_url,
            persona
        });
        
        if (persona === 'bapperida' && response.text) {
            response.text = response.text.replace(/Nayaxa/gi, 'Bapperida AI');
        }
        res.json(response);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Health Check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'Nayaxa Engine is Awake', version: '4.3' });
});

app.listen(PORT, () => {
    console.log(`\n🤖 Nayaxa AI Engine v4.3 is running on port ${PORT}`);
    console.log(`📡 Ready to process Grand Blueprint instructions...\n`);
});
