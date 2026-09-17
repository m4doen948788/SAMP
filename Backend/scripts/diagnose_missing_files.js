const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Try multiple environment file locations
const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded env from ${envPath}`);
        envLoaded = true;
        break;
    }
}
if (!envLoaded) {
    dotenv.config();
}

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'dashboard_ppm',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [rows] = await pool.query(`
            SELECT id, nama_file, path, is_deleted
            FROM dokumen_upload 
            WHERE nama_file LIKE '%permendagri%' 
               OR nama_file LIKE '%perbup%' 
               OR nama_file LIKE '%86%' 
               OR nama_file LIKE '%76%'
        `);

        console.log('=== DATABASE RECORDS ===');
        for (const row of rows) {
            // Option 1: /var/www/dashboard-ppm/uploads/ (Root level)
            const pathRoot = path.join(__dirname, '../..', row.path);
            const existsRoot = fs.existsSync(pathRoot);

            // Option 2: /var/www/dashboard-ppm/Backend/uploads/ (Backend level)
            // row.path usually starts with "/uploads/" or "uploads/"
            const cleanPath = row.path.startsWith('/') ? row.path.substring(1) : row.path;
            const pathBackend = path.join(__dirname, '..', cleanPath);
            const existsBackend = fs.existsSync(pathBackend);

            console.log({
                id: row.id,
                nama_file: row.nama_file,
                db_path: row.path,
                is_deleted: row.is_deleted,
                pathRoot: pathRoot,
                existsRoot: existsRoot,
                pathBackend: pathBackend,
                existsBackend: existsBackend
            });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
