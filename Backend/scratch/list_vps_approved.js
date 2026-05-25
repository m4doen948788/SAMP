const pool = require('../src/config/db');

async function run() {
    try {
        console.log("=== APPROVED DOCUMENTS IN VPS DATABASE ===");
        const [rows] = await pool.query("SELECT id, perihal, verification_slug, approval_status FROM surat WHERE approval_status = 'APPROVED'");
        console.log(`Found ${rows.length} approved documents:`);
        rows.forEach(r => {
            console.log(` - ID: ${r.id} | ${r.perihal} | Slug: ${r.verification_slug}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
