const pool = require('./db');

async function alterGeneratedPages() {
    try {
        console.log('Adding tipe_akses to generated_pages...');

        // Add column if not exists
        try {
            await pool.query('ALTER TABLE generated_pages ADD COLUMN tipe_akses VARCHAR(50) DEFAULT "Privat" AFTER menu_id');
            console.log('Column tipe_akses added successfully.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column tipe_akses already exists. Skipping...');
            } else {
                throw e;
            }
        }

        // Update existing records to Privat just to be sure
        await pool.query('UPDATE generated_pages SET tipe_akses = "Privat" WHERE tipe_akses IS NULL');
        console.log('Existing records updated to Privat.');

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

alterGeneratedPages();
