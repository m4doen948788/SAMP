const axios = require('axios');
const pool = require('./src/config/db');
require('dotenv').config();

async function listModels() {
    try {
        let apiKey = process.env.GEMINI_API_KEY;
        const [rows] = await pool.query('SELECT api_key FROM gemini_api_keys WHERE is_active = 1 LIMIT 1');
        if (rows.length > 0 && rows[0].api_key) {
            apiKey = rows[0].api_key;
        }

        if (!apiKey) {
            console.log("No API Key found");
            process.exit(1);
        }
        
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (response.data && response.data.models) {
            console.log("Available Gemini Models:");
            response.data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log("- " + m.name.replace('models/', ''));
                }
            });
        }
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        pool.end();
        process.exit(0);
    }
}

listModels();
