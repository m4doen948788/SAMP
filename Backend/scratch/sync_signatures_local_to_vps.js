const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables for destination DB
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sourceConfig = {
    host: 'kasibah.com',
    user: 'kasibahc_dashboard_ppm',
    password: 'eW7UFcbuRrJmKECk5mNz',
    database: 'kasibahc_dashboard_ppm',
    port: 3306
};

const destConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function run() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'sync'; // 'sync', 'export', or 'import'

    if (mode === 'export') {
        console.log("=== EXPORTING SIGNATURES FROM DEVELOPMENT DB ===");
        try {
            const connection = await mysql.createConnection(sourceConfig);
            const [rows] = await connection.query(`
                SELECT id, signature_image, paraf_image
                FROM profil_pegawai
                WHERE signature_image IS NOT NULL OR paraf_image IS NOT NULL
            `);
            await connection.end();

            const exportPath = path.join(__dirname, '../signatures_export.json');
            fs.writeFileSync(exportPath, JSON.stringify(rows, null, 2));
            console.log(`✅ Exported ${rows.length} profiles to ${exportPath}`);
            console.log("Please upload this file to /var/www/dashboard-ppm/Backend/ on your VPS.");
        } catch (e) {
            console.error("❌ Export failed:", e.message);
        }
    } else if (mode === 'import') {
        console.log("=== IMPORTING SIGNATURES TO PRODUCTION DB ===");
        try {
            const importPath = path.join(__dirname, '../signatures_export.json');
            if (!fs.existsSync(importPath)) {
                console.log(`❌ Import file not found: ${importPath}`);
                return;
            }
            const data = JSON.parse(fs.readFileSync(importPath, 'utf8'));

            const connection = await mysql.createConnection(destConfig);
            let count = 0;
            for (const row of data) {
                await connection.query(`
                    UPDATE profil_pegawai
                    SET signature_image = ?, paraf_image = ?
                    WHERE id = ?
                `, [row.signature_image, row.paraf_image, row.id]);
                count++;
            }
            await connection.end();
            console.log(`✅ Successfully updated ${count} profiles in production DB.`);
        } catch (e) {
            console.error("❌ Import failed:", e.message);
        }
    } else {
        // Direct Sync mode
        console.log("=== DIRECT SYNC SIGNATURES (DEV -> PROD) ===");
        let sourceConn, destConn;
        try {
            console.log("Connecting to source database (kasibah.com)...");
            sourceConn = await mysql.createConnection(sourceConfig);
            console.log("Connecting to destination database...");
            destConn = await mysql.createConnection(destConfig);

            const [rows] = await sourceConn.query(`
                SELECT id, signature_image, paraf_image
                FROM profil_pegawai
                WHERE signature_image IS NOT NULL OR paraf_image IS NOT NULL
            `);

            console.log(`Found ${rows.length} profiles with signatures/paraf. Syncing...`);
            let count = 0;
            for (const row of rows) {
                await destConn.query(`
                    UPDATE profil_pegawai
                    SET signature_image = ?, paraf_image = ?
                    WHERE id = ?
                `, [row.signature_image, row.paraf_image, row.id]);
                count++;
            }
            console.log(`✅ Successfully synced ${count} profiles.`);
        } catch (e) {
            console.error("❌ Direct Sync failed:", e.message);
            console.log("\n💡 Connection issue? Use export/import mode instead:");
            console.log("1. Run locally on your PC: node Backend/scratch/sync_signatures_local_to_vps.js export");
            console.log("2. Upload the generated 'Backend/signatures_export.json' to /var/www/dashboard-ppm/Backend/ on the VPS.");
            console.log("3. Run on VPS: node Backend/scratch/sync_signatures_local_to_vps.js import");
        } finally {
            if (sourceConn) await sourceConn.end();
            if (destConn) await destConn.end();
        }
    }
}

run();
