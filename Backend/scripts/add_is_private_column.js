const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
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
        console.log('🚀 Checking if is_private column exists in dokumen_upload...');
        
        // Check if column exists
        const [columns] = await pool.query(`
            SHOW COLUMNS FROM dokumen_upload LIKE 'is_private'
        `);

        if (columns.length === 0) {
            console.log('Adding is_private column to dokumen_upload table...');
            await pool.query(`
                ALTER TABLE dokumen_upload 
                ADD COLUMN is_private TINYINT(1) DEFAULT 0 AFTER is_indexed
            `);
            console.log('✅ Column is_private added successfully!');
        } else {
            console.log('ℹ️ Column is_private already exists.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

run();
