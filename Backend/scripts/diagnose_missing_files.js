const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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
            // Path inside database is usually like "/uploads/xxx.pdf"
            // The physical file is stored in "/var/www/dashboard-ppm/uploads/xxx.pdf"
            // Let's resolve the path relative to the root directory
            const absolutePath = path.join(__dirname, '../..', row.path);
            const existsOnDisk = fs.existsSync(absolutePath);
            console.log({
                id: row.id,
                nama_file: row.nama_file,
                db_path: row.path,
                is_deleted: row.is_deleted,
                absolutePath: absolutePath,
                existsOnDisk: existsOnDisk
            });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
