const pool = require('../src/config/db');
const { generateSlug, generateHash } = require('../src/utils/cryptoUtils');

async function run() {
    console.log("=== FIXING EXISTING SURAT DATA ===");
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch all surat records
        const [rows] = await connection.query("SELECT id, perihal, verification_slug, isi_surat, approval_status, integrity_hash FROM surat");
        console.log(`Processing ${rows.length} documents...`);

        let fixCount = 0;
        for (const row of rows) {
            let needsUpdate = false;
            let currentSlug = row.verification_slug;
            let currentIsi = row.isi_surat || '';
            let currentStatus = row.approval_status;

            // Generate slug if missing
            if (!currentSlug) {
                currentSlug = generateSlug();
                console.log(`[Surat ID: ${row.id}] Generating missing verification slug: ${currentSlug}`);
                needsUpdate = true;
            }

            // Replace localhost signature/paraf paths with proper production domain links or relative paths
            if (currentIsi.includes('localhost:') || currentIsi.includes('127.0.0.1:')) {
                console.log(`[Surat ID: ${row.id}] Fixing localhost links inside HTML...`);
                // Replace http://localhost:XXXX/uploads/ or http://127.0.0.1:XXXX/uploads/ with https://bapperida-ppm.my.id/uploads/
                const cleanedIsi = currentIsi.replace(/http:\/\/localhost:\d+\/uploads\//g, 'https://bapperida-ppm.my.id/uploads/')
                                             .replace(/http:\/\/127\.0\.0\.1:\d+\/uploads\//g, 'https://bapperida-ppm.my.id/uploads/');
                
                if (cleanedIsi !== currentIsi) {
                    currentIsi = cleanedIsi;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                // If it is APPROVED, we should also lock/recalculate the integrity hash
                let updateQuery = "UPDATE surat SET verification_slug = ?, isi_surat = ? WHERE id = ?";
                let updateParams = [currentSlug, currentIsi, row.id];

                if (currentStatus === 'APPROVED') {
                    const newHash = generateHash(currentIsi);
                    updateQuery = "UPDATE surat SET verification_slug = ?, isi_surat = ?, integrity_hash = ? WHERE id = ?";
                    updateParams = [currentSlug, currentIsi, newHash, row.id];
                    console.log(`[Surat ID: ${row.id}] Approved doc -> Recalculated integrity hash: ${newHash}`);
                }

                await connection.query(updateQuery, updateParams);
                fixCount++;
            }
        }

        await connection.commit();
        console.log(`\n✅ Transaction committed. Successfully fixed ${fixCount} documents!`);
    } catch (e) {
        await connection.rollback();
        console.error("❌ Fix failed:", e);
    } finally {
        connection.release();
        process.exit();
    }
}

run();
