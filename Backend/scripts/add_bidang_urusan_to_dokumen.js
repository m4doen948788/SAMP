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
        console.log('🚀 Checking if bidang_urusan_id column exists in dokumen_upload...');
        const [columns] = await pool.query('DESCRIBE dokumen_upload');
        const hasColumn = columns.some(col => col.Field === 'bidang_urusan_id');

        if (!hasColumn) {
            console.log('Adding bidang_urusan_id column to dokumen_upload table...');
            await pool.query(`
                ALTER TABLE dokumen_upload 
                ADD COLUMN bidang_urusan_id INT NULL,
                ADD CONSTRAINT fk_dokumen_bidang_urusan 
                FOREIGN KEY (bidang_urusan_id) REFERENCES master_bidang_urusan(id) 
                ON DELETE SET NULL
            `);
            console.log('✅ Column bidang_urusan_id and foreign key added successfully!');
        } else {
            console.log('✅ Column bidang_urusan_id already exists.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();
