const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        envLoaded = true;
        break;
    }
}
if (!envLoaded) dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'dashboard_ppm',
    });

    try {
        const query = "SELECT id, nama_file, uploaded_at FROM dokumen_upload WHERE nama_file LIKE '%Permenkes Nomor 6%' OR nama_file LIKE '%STANDAR TEKNIS%'";
        const [rows] = await pool.query(query);
        console.log('=== MATCHING DOCUMENTS ===');
        console.table(rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
