const pool = require('../src/config/db');

async function run() {
    try {
        console.log('--- STARTING GLOBAL NUMBERING RESET ---');
        
        // 1. Clear Logs
        console.log('Clearing surat_nomor_log...');
        await pool.query('DELETE FROM surat_nomor_log');
        
        // 2. Clear Slots
        console.log('Clearing surat_daily_slots...');
        await pool.query('DELETE FROM surat_daily_slots');
        
        // 3. Reset Counters
        console.log('Resetting surat_counters to 0...');
        await pool.query('UPDATE surat_counters SET last_number = 0');
        
        console.log('✅ RESET COMPLETE. System is now fresh.');
        process.exit(0);
    } catch (e) {
        console.error('❌ RESET FAILED:', e);
        process.exit(1);
    }
}

run();
