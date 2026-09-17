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
        console.log('🚀 Checking schema for deleted_by columns...');
        
        // 1. Check/Add deleted_by to dokumen_upload
        const [docCols] = await pool.query('DESCRIBE dokumen_upload');
        const docHasDeletedBy = docCols.some(col => col.Field === 'deleted_by');
        if (!docHasDeletedBy) {
            console.log('Adding deleted_by column to dokumen_upload...');
            await pool.query('ALTER TABLE dokumen_upload ADD COLUMN deleted_by INT NULL AFTER is_private');
            console.log('✅ Column deleted_by added to dokumen_upload.');
        } else {
            console.log('✅ Column deleted_by already exists in dokumen_upload.');
        }

        // 2. Check/Add deleted_by to surat
        const [suratCols] = await pool.query('DESCRIBE surat');
        const suratHasDeletedBy = suratCols.some(col => col.Field === 'deleted_by');
        if (!suratHasDeletedBy) {
            console.log('Adding deleted_by column to surat...');
            await pool.query('ALTER TABLE surat ADD COLUMN deleted_by INT NULL AFTER verification_slug');
            console.log('✅ Column deleted_by added to surat.');
        } else {
            console.log('✅ Column deleted_by already exists in surat.');
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

run();
