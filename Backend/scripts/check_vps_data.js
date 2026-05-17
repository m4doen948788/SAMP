const pool = require('../src/config/db');

async function diagnose() {
    try {
        console.log('=== VPS DATABASE DIAGNOSIS ===');
        
        // 1. Check gemini_api_keys
        try {
            const [keys] = await pool.query('SELECT id, label, email, jenis_ai, is_active FROM gemini_api_keys');
            console.log(`✅ Table 'gemini_api_keys' exists. Total rows: ${keys.length}`);
            if (keys.length > 0) {
                console.log('Sample data (api_keys):');
                console.table(keys.map(k => ({ id: k.id, label: k.label, email: k.email, jenis_ai: k.jenis_ai, is_active: k.is_active })));
            } else {
                console.log('⚠️ Table exists but is completely empty!');
            }
        } catch (err) {
            console.error('❌ Table \'gemini_api_keys\' does NOT exist or failed to query:', err.message);
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
            const [roles] = await pool.query('SELECT id, nama_tipe FROM master_tipe_user');
            console.log('\n✅ Available Roles in Database:');
            console.table(roles);
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
