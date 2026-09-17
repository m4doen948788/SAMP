const pool = require('../src/config/db');
const fs = require('fs');

async function run() {
    try {
        console.log('--- STARTING GLOBAL AUDIT ---');
        // Fetch ALL logs without date filtering
        const [rows] = await pool.query(`
            SELECT l.*, b.nama_bidang, i.instansi 
            FROM surat_nomor_log l 
            LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id 
            LEFT JOIN master_instansi_daerah i ON l.instansi_id = i.id 
            ORDER BY l.id DESC
        `);
        
        fs.writeFileSync('scratch/final_audit.json', JSON.stringify(rows, null, 2), 'utf8');
        console.log(`Audit complete. Found ${rows.length} total logs.`);
        process.exit(0);
    } catch(e) {
        console.error('Audit failed:', e);
        process.exit(1);
    }
}

run();
