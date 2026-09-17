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
        console.log('=== TABLE ENGINES & COLLATIONS ===');
        const [engines] = await pool.query(`
            SELECT TABLE_NAME, ENGINE, TABLE_COLLATION 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('dokumen_upload', 'master_bidang_urusan', 'dokumen_bidang_urusan')
        `, [process.env.DB_NAME || 'dashboard_ppm']);
        console.table(engines);

        console.log('\n=== FOREIGN KEYS ON dokumen_upload ===');
        const [fks] = await pool.query(`
            SELECT 
                CONSTRAINT_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'dokumen_upload' AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [process.env.DB_NAME || 'dashboard_ppm']);
        console.table(fks);

        console.log('\n=== CHECKING IF WE CAN RUN CREATE TABLE WITHOUT FOREIGN KEYS FIRST ===');
        console.log('Attempting to check if dropping fk_dokumen_bidang_urusan works first...');
        try {
            await pool.query('ALTER TABLE dokumen_upload DROP FOREIGN KEY fk_dokumen_bidang_urusan');
            console.log('✅ Successfully dropped fk_dokumen_bidang_urusan');
        } catch (e) {
            console.log('❌ Failed to drop fk_dokumen_bidang_urusan:', e.message);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
