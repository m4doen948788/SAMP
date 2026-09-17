const pool = require('./src/config/db');

async function debugOrphans() {
    try {
        const [broken] = await pool.query('SELECT id, kode_urusan, urusan FROM master_bidang_urusan WHERE parent_id IS NULL');
        console.log('Orphan Bidangs Count:', broken.length);
        console.log('First 5 orphans:', JSON.stringify(broken.slice(0, 5), null, 2));

        const [counts] = await pool.query('SELECT COUNT(*) as count FROM master_bidang_urusan');
        console.log('Total Bidangs:', counts[0].count);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugOrphans();
