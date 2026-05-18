const mysql = require('mysql2/promise');

async function getKeys() {
    try {
        console.log('Connecting to kasibah.com...');
        const connection = await mysql.createConnection({
            host: 'kasibah.com',
            user: 'kasibahc_dashboard_ppm',
            password: 'eW7UFcbuRrJmKECk5mNz',
            database: 'kasibahc_dashboard_ppm'
        });
        
        const [rows] = await connection.query("SELECT id, label, jenis_ai, api_key, is_active FROM gemini_api_keys");
        console.log('=== GEMINI & DEEPSEEK KEYS FROM KASIBAH.COM ===');
        rows.forEach(r => {
            console.log(`ID: ${r.id} | Label: ${r.label} | Jenis: ${r.jenis_ai} | Active: ${r.is_active}`);
            console.log(`Key: ${r.api_key}\n-----------------------------------`);
        });

        await connection.end();
    } catch (err) {
        console.error('Error fetching keys:', err);
    }
}

getKeys();
