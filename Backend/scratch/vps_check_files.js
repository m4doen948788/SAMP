const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkFiles() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Database Host:', process.env.DB_HOST);
        console.log('Database Name:', process.env.DB_NAME);

        const [rows] = await pool.query('SELECT id, nama_file, path, nama_asli_unggah FROM dokumen_upload ORDER BY id DESC LIMIT 15');
        console.log('--- LATEST 15 DOCUMENTS IN DB ---');
        
        const uploadsDir = '/var/www/dashboard-ppm/Backend/uploads';
        
        for (const row of rows) {
            // resolve physical path
            const filename = path.basename(row.path);
            const physicalPath = path.join(uploadsDir, filename);
            const exists = fs.existsSync(physicalPath);
            
            console.log(`ID: ${row.id}`);
            console.log(`  Nama Visual: ${row.nama_file}`);
            console.log(`  Nama Asli  : ${row.nama_asli_unggah}`);
            console.log(`  DB Path    : ${row.path}`);
            console.log(`  Physical   : ${physicalPath}`);
            console.log(`  Exists?    : ${exists ? 'YES' : 'NO'}`);
            console.log('------------------------------');
        }
    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        await pool.end();
    }
}

checkFiles();
