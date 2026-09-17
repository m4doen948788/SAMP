const pool = require('../src/config/db');

async function diagnose() {
    try {
        console.log('=== VPS DATABASE DIAGNOSIS ===');
        
        // 1. Check gemini_api_keys
        try {
            // First inspect columns
            const [cols] = await pool.query('SHOW COLUMNS FROM gemini_api_keys');
            const colNames = cols.map(c => c.Field);
            console.log(`✅ Table 'gemini_api_keys' exists. Columns found: [${colNames.join(', ')}]`);

            const selectCols = ['id', 'label', 'is_active'];
            if (colNames.includes('email')) selectCols.push('email');
            if (colNames.includes('jenis_ai')) selectCols.push('jenis_ai');

            const [keys] = await pool.query(`SELECT ${selectCols.join(', ')} FROM gemini_api_keys`);
            console.log(`✅ Total rows in 'gemini_api_keys': ${keys.length}`);
            if (keys.length > 0) {
                console.log('Data:');
                console.table(keys);
            } else {
                console.log('⚠️ Table is completely empty!');
            }
        } catch (err) {
            console.error('❌ Table \'gemini_api_keys\' failed to query:', err.message);
        }

        // 2. Check nayaxa_widget_prompts
        try {
            const [prompts] = await pool.query('SELECT id, label, urutan, is_active FROM nayaxa_widget_prompts');
            console.log(`\n✅ Table 'nayaxa_widget_prompts' exists. Total rows: ${prompts.length}`);
            if (prompts.length > 0) {
                console.log('Sample data (prompts):');
                console.table(prompts);
            } else {
                console.log('⚠️ Table exists but is completely empty!');
            }
        } catch (err) {
            console.error('❌ Table \'nayaxa_widget_prompts\' does NOT exist or failed to query:', err.message);
        }

        // 3. Check user roles in master_tipe_user
        try {
            const [roles] = await pool.query('SELECT * FROM master_tipe_user');
            console.log('\n✅ Available Roles in Database:');
            console.table(roles.map(r => ({ id: r.id, nama: r.nama || r.nama_tipe || r.role_name || JSON.stringify(r) })));
        } catch (err) {
            console.error('❌ Failed to fetch user roles:', err.message);
        }

    } catch (err) {
        console.error('Diagnosis failed:', err);
    } finally {
        process.exit();
    }
}

diagnose();
