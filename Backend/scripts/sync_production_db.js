const mysql = require('mysql2/promise');
const destPool = require('../src/config/db');

async function syncDb() {
    let sourceConnection;
    try {
        console.log('--- STARTING REMOTE TO VPS DATABASE SYNC ---');

        // 1. Establish connection to the source database on kasibah.com
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
                const updateAssignments = columns
                    .filter(col => col !== 'id')
                    .map(col => `\`${col}\` = VALUES(\`${col}\`)`)
                    .join(', ');

                const sql = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) 
                             VALUES (${placeholders}) 
                             ON DUPLICATE KEY UPDATE ${updateAssignments || 'id = VALUES(id)'}`;

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
