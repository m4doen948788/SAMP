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
        const altUploadsDir = '/var/www/nayaxa-engine/Backend/uploads';
        
        for (const row of rows) {
            if (!row.path) continue;
            
            // Resolve subfolders correctly (e.g. /uploads/kegiatan/file.pdf -> kegiatan/file.pdf)
            const relativePath = row.path.replace(/^\/uploads\//, '');
            const physicalPath = path.join(uploadsDir, relativePath);
            const existsInMain = fs.existsSync(physicalPath);
            
            let foundLocation = null;
            if (existsInMain) {
                foundLocation = 'Main Dashboard Uploads';
            } else {
                // Check in alternative Nayaxa directory
                const altPath = path.join(altUploadsDir, relativePath);
                if (fs.existsSync(altPath)) {
                    foundLocation = 'Nayaxa Engine Uploads';
                } else {
                    // Check if it was placed inside /uploads/dashboard/ of Nayaxa
                    const altDashboardPath = path.join(altUploadsDir, 'dashboard', path.basename(relativePath));
                    if (fs.existsSync(altDashboardPath)) {
                        foundLocation = 'Nayaxa Engine Uploads (subfolder dashboard)';
                    }
                }
            }
            
            console.log(`ID: ${row.id}`);
            console.log(`  Nama Visual: ${row.nama_file}`);
            console.log(`  Nama Asli  : ${row.nama_asli_unggah}`);
            console.log(`  DB Path    : ${row.path}`);
            console.log(`  Physical   : ${physicalPath}`);
            console.log(`  Exists?    : ${foundLocation ? `YES (${foundLocation})` : 'NO'}`);
            console.log('------------------------------');
        }
    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        await pool.end();
    }
}

checkFiles();
