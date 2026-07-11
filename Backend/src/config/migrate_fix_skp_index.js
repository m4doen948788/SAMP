const pool = require('./db');

async function run() {
    try {
        console.log('🚀 Checking and updating unique constraints on skp_pegawai_docs table...');
        
        // 1. Drop old constraint if exists
        try {
            console.log('Dropping old index unique_pegawai_tahun_kategori_bulan_butir...');
            await pool.query('ALTER TABLE skp_pegawai_docs DROP INDEX unique_pegawai_tahun_kategori_bulan_butir');
            console.log('✅ Success dropping index');
        } catch (err) {
            console.log('⚠️ Note: Could not drop index unique_pegawai_tahun_kategori_bulan_butir (maybe already dropped or named differently):', err.message);
        }

        // 2. Try to drop unique_pegawai_tahun_kategori_bulan_butir_doc index if already exists (to prevent duplication errors)
        try {
            await pool.query('ALTER TABLE skp_pegawai_docs DROP INDEX unique_pegawai_tahun_kategori_bulan_butir_doc');
            console.log('✅ Removed existing unique_pegawai_tahun_kategori_bulan_butir_doc for recreation');
        } catch (err) {
            // Safe to ignore if doesn't exist
        }

        // 3. Create the new correct constraint including doc_id
        console.log('Creating new unique constraint including doc_id column...');
        await pool.query(`
            ALTER TABLE skp_pegawai_docs 
            ADD UNIQUE KEY unique_pegawai_tahun_kategori_bulan_butir_doc 
            (pegawai_id, tahun, bidang_id, kategori, bulan, butir_skp, doc_id)
        `);
        console.log('✅ Successfully created unique_pegawai_tahun_kategori_bulan_butir_doc constraint!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

run();
