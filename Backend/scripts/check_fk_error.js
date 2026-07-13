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
        console.log('=== DESCRIBE TABLE: dokumen_upload ===');
        try {
            const [desc] = await pool.query('DESCRIBE dokumen_upload');
            console.table(desc);
        } catch (e) {
            console.error('Error describing dokumen_upload:', e.message);
        }

        console.log('\n=== DESCRIBE TABLE: master_bidang_urusan ===');
        try {
            const [desc] = await pool.query('DESCRIBE master_bidang_urusan');
            console.table(desc);
        } catch (e) {
            console.error('Error describing master_bidang_urusan:', e.message);
        }

        console.log('\n=== SHOW ENGINE INNODB STATUS (LATEST FOREIGN KEY ERROR) ===');
        try {
            const [rows] = await pool.query('SHOW ENGINE INNODB STATUS');
            const status = rows[0].Status;
            const fkErrorIdx = status.indexOf('LATEST FOREIGN KEY ERROR');
            if (fkErrorIdx !== -1) {
                // Get the next 2000 characters from the error index to print the detailed mismatch
                console.log(status.substring(fkErrorIdx, fkErrorIdx + 2000));
            } else {
                console.log('No foreign key error section found in InnoDB status. Printing first 1000 chars of InnoDB status instead:');
                console.log(status.substring(0, 1000));
            }
        } catch (e) {
            console.error('Error showing InnoDB status:', e.message);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
