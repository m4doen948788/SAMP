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
        console.log('🚀 Checking if dokumen_bidang_urusan junction table exists...');
        
        // Create junction table for many-to-many relationship
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dokumen_bidang_urusan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                dokumen_id INT NOT NULL,
                bidang_urusan_id INT NOT NULL,
                FOREIGN KEY (dokumen_id) REFERENCES dokumen_upload(id) ON DELETE CASCADE,
                FOREIGN KEY (bidang_urusan_id) REFERENCES master_bidang_urusan(id) ON DELETE CASCADE,
                UNIQUE KEY unique_dokumen_urusan (dokumen_id, bidang_urusan_id)
            )
        `);
        console.log('✅ Junction table dokumen_bidang_urusan verified/created successfully!');

        // Safely clean up/drop the old single column in dokumen_upload
        try {
            console.log('Checking for old column bidang_urusan_id...');
            const [columns] = await pool.query('DESCRIBE dokumen_upload');
            const hasOldColumn = columns.some(col => col.Field === 'bidang_urusan_id');
            if (hasOldColumn) {
                console.log('Dropping old single column bidang_urusan_id from dokumen_upload...');
                await pool.query('ALTER TABLE dokumen_upload DROP FOREIGN KEY fk_dokumen_bidang_urusan');
                await pool.query('ALTER TABLE dokumen_upload DROP COLUMN bidang_urusan_id');
                console.log('✅ Old column bidang_urusan_id dropped.');
            }
        } catch (colErr) {
            console.log('Info: Old column check skipped or dropped already.', colErr.message);
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();
