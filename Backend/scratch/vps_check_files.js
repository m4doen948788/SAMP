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
        
        // List directories in /var/www to see if there are other old folders
        console.log('--- DIRECTORIES IN /var/www ---');
        try {
            const varWwwDirs = fs.readdirSync('/var/www');
            console.log(varWwwDirs.join(', '));
        } catch (e) {
            console.log('Error reading /var/www:', e.message);
        }
        console.log('-------------------------------\n');

        // Helper function to recursively search for a file in a directory
        function findFileRecursive(dir, filename) {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        // Skip node_modules and .git
                        if (file === 'node_modules' || file === '.git') continue;
                        const found = findFileRecursive(fullPath, filename);
                        if (found) return found;
                    } else if (file === filename) {
                        return fullPath;
                    }
                }
            } catch (err) {
                // Ignore read errors
            }
            return null;
        }
        
        for (const row of rows) {
            if (!row.path) continue;
            
            const relativePath = row.path.replace(/^\/uploads\//, '');
            const filename = path.basename(relativePath);
            const physicalPath = path.join(uploadsDir, relativePath);
            const existsInMain = fs.existsSync(physicalPath);
            
            let foundLocation = null;
            if (existsInMain) {
                foundLocation = 'Main Dashboard Uploads';
            } else {
                // Search the entire /var/www directory for this filename
                const foundPath = findFileRecursive('/var/www', filename);
                if (foundPath) {
                    foundLocation = foundPath;
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
