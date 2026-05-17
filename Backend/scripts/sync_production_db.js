const mysql = require('mysql2/promise');
const destPool = require('../src/config/db');

async function syncDb() {
    let sourceConnection;
    try {
        console.log('--- STARTING REMOTE TO VPS DATABASE SYNC ---');

        // 1. Ensure tables exist in destination VPS database with correct columns
        console.log('Ensuring tables exist in destination database...');
        
        await destPool.query(`
            CREATE TABLE IF NOT EXISTS gemini_api_keys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(255) NOT NULL,
                api_key TEXT NOT NULL,
                email VARCHAR(255) DEFAULT NULL,
                jenis_ai VARCHAR(50) DEFAULT 'Gemini Free',
                is_active TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table gemini_api_keys verified.');

        await destPool.query(`
            CREATE TABLE IF NOT EXISTS nayaxa_widget_prompts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(255) NOT NULL,
                prompt TEXT NOT NULL,
                urutan INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table nayaxa_widget_prompts verified.');

        // 2. Establish connection to the source database on kasibah.com
        console.log('Connecting to source database: kasibah.com...');
        sourceConnection = await mysql.createConnection({
            host: 'kasibah.com',
            user: 'kasibahc_dashboard_ppm',
            password: 'eW7UFcbuRrJmKECk5mNz',
            database: 'kasibahc_dashboard_ppm',
            connectTimeout: 10000
        });
        console.log('✅ Successfully connected to source database!');

        const tablesToSync = ['gemini_api_keys', 'nayaxa_widget_prompts'];

        for (const tableName of tablesToSync) {
            console.log(`\nSyncing table: ${tableName}...`);

            // Fetch columns of the table from destination to make sure we don't insert non-existent columns
            const [columnsInfo] = await destPool.query(`SHOW COLUMNS FROM ${tableName}`);
            const validColumns = columnsInfo.map(col => col.Field);
            
            // Fetch all rows from source table
            const [rows] = await sourceConnection.query(`SELECT * FROM ${tableName}`);
            console.log(`Fetched ${rows.length} rows from source table '${tableName}'.`);

            if (rows.length === 0) {
                console.log(`ℹ️ No rows to sync for '${tableName}'.`);
                continue;
            }

            // Clear existing rows in destination to perform a clean sync
            await destPool.query(`DELETE FROM ${tableName}`);
            console.log(`Cleared existing rows in destination table '${tableName}'.`);

            let syncCount = 0;
            for (const row of rows) {
                // Filter row properties to only include columns that exist in the destination table
                const filteredRow = {};
                for (const col of validColumns) {
                    if (row[col] !== undefined) {
                        filteredRow[col] = row[col];
                    }
                }

                const columns = Object.keys(filteredRow);
                const values = Object.values(filteredRow);
                const placeholders = columns.map(() => '?').join(', ');

                const sql = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;

                await destPool.query(sql, values);
                syncCount++;
            }
            console.log(`✅ Successfully synchronized ${syncCount} rows into '${tableName}'.`);
        }

        console.log('\n--- REMOTE TO VPS DATABASE SYNC COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error syncing databases:', err);
        process.exit(1);
    } finally {
        if (sourceConnection) {
            await sourceConnection.end();
        }
    }
}

syncDb();
