const pool = require('../src/config/db');

async function check() {
    try {
        const [docs] = await pool.query('SELECT * FROM master_dokumen LIMIT 100');
        console.log('master_dokumen:');
        console.table(docs);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
