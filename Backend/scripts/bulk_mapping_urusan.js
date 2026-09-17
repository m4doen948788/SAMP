const pool = require('./src/config/db');

async function bulkMap() {
    try {
        const BAPPERIDA_ID = 2;

        // Get all urusan
        const [urusan] = await pool.query("SELECT id FROM master_urusan");
        console.log(`Found ${urusan.length} urusan.`);

        for (const u of urusan) {
            // Check if already mapped
            const [existing] = await pool.query(
                "SELECT id FROM mapping_urusan_instansi WHERE urusan_id = ? AND instansi_id = ?",
                [u.id, BAPPERIDA_ID]
            );

            if (existing.length === 0) {
                await pool.query(
                    "INSERT INTO mapping_urusan_instansi (urusan_id, instansi_id) VALUES (?, ?)",
                    [u.id, BAPPERIDA_ID]
                );
                console.log(`Mapped urusan ID ${u.id} to Bapperida.`);
            } else {
                console.log(`Urusan ID ${u.id} already mapped to Bapperida.`);
            }
        }

        console.log('Bulk mapping completed.');
        process.exit(0);
    } catch (err) {
        console.error('Bulk mapping failed:', err);
        process.exit(1);
    }
}

bulkMap();
