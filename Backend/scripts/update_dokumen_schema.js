const pool = require('./src/config/db');

async function updateSchema() {
    try {
        console.log('Updating dokumen_upload table schema...');

        // 1. Add hash column if not exists
        await pool.query(`
            ALTER TABLE dokumen_upload 
            ADD COLUMN IF NOT EXISTS hash VARCHAR(64) AFTER ukuran,
            ADD COLUMN IF NOT EXISTS nama_asli_unggah VARCHAR(255) AFTER nama_file
        `);
        console.log('- Columns added successfully.');

        // 2. Add indexes for performance
        // Check if indexes exist first to avoid errors
        const [indexes] = await pool.query('SHOW INDEX FROM dokumen_upload');
        const indexNames = indexes.map(idx => idx.Key_name);

        if (!indexNames.includes('idx_dokumen_hash')) {
            await pool.query('CREATE INDEX idx_dokumen_hash ON dokumen_upload(hash)');
            console.log('- Index idx_dokumen_hash created.');
        }

        if (!indexNames.includes('idx_dokumen_nama_file')) {
            await pool.query('CREATE INDEX idx_dokumen_nama_file ON dokumen_upload(nama_file)');
            console.log('- Index idx_dokumen_nama_file created.');
        }

        console.log('Schema update completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Schema update failed:', err.message);
        process.exit(1);
    }
}

updateSchema();
