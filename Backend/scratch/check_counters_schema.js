const pool = require('../src/config/db');

async function run() {
    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM surat_counters');
        console.log('Columns:');
        console.table(cols);
        
        const [indexes] = await pool.query('SHOW INDEX FROM surat_counters');
        console.log('Indexes:');
        console.table(indexes);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
