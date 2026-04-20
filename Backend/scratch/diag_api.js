const pool = require('../src/config/db');

async function run() {
    try {
        const month = 4;
        const year = 2026;
        const instansi_id = 2; // Bapperida

        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();
        const lastDay = new Date(y, m, 0).getDate();
        
        const startDate = `${y}-${m.toString().padStart(2, '0')}-01`;
        const endDate = `${y}-${m.toString().padStart(2, '0')}-${lastDay} 23:59:59`; // Also added time to be safe

        console.log('--- DIAGNOSING TIME RANGE ---');
        console.log('Start Date:', startDate);
        console.log('End Date:', endDate);

        // Check Logs
        const [logs] = await pool.query(
            'SELECT id, nomor_surat_full, tanggal_surat, instansi_id FROM surat_nomor_log WHERE tanggal_surat >= ? AND tanggal_surat <= ? AND instansi_id = ?',
            [startDate, endDate, instansi_id]
        );
        console.log('\n--- LOGS CAPTURED ---');
        console.table(logs);

        // Check Slots
        const [slots] = await pool.query(
            'SELECT id, tanggal, start_number, end_number FROM surat_daily_slots WHERE instansi_id = ? AND tanggal >= ? AND tanggal <= ?',
            [instansi_id, startDate, endDate]
        );
        console.log('\n--- SLOTS CAPTURED ---');
        console.table(slots);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
