const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function backfillHashes() {
    try {
        console.log('Starting backfill for existing files...');

        // 1. Get all files with NULL hash
        const [rows] = await pool.query('SELECT id, path, nama_file FROM dokumen_upload WHERE hash IS NULL');
        
        if (rows.length === 0) {
            console.log('No files to backfill.');
            process.exit(0);
        }

        console.log(`Found ${rows.length} files to process.`);

        for (const row of rows) {
            try {
                const absolutePath = path.join(__dirname, row.path);
                if (fs.existsSync(absolutePath)) {
                    const fileBuffer = fs.readFileSync(absolutePath);
                    const hashHex = crypto.createHash('md5').update(fileBuffer).digest('hex');
                    
                    await pool.query(
                        'UPDATE dokumen_upload SET hash = ?, nama_asli_unggah = COALESCE(nama_asli_unggah, nama_file) WHERE id = ?',
                        [hashHex, row.id]
                    );
                    console.log(`- Processed ID ${row.id}: ${row.nama_file}`);
                } else {
                    console.warn(`- File not found for ID ${row.id}: ${absolutePath}`);
                }
            } catch (err) {
                console.error(`- Error processing ID ${row.id}:`, err.message);
            }
        }

        console.log('Backfill completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Backfill failed:', err.message);
        process.exit(1);
    }
}

backfillHashes();
