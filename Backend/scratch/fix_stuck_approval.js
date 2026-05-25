const pool = require('../src/config/db');

async function run() {
    try {
        console.log("=== FIXING STUCK APPROVAL FLOWS ===");
        
        // Find all documents where the document is WAITING_APPROVAL,
        // but there are steps which are still in RETURNED status.
        // We will reset those steps back to PENDING so they can be processed.
        
        const [stuckApprovals] = await pool.query(`
            SELECT sa.id, sa.surat_id, sa.approver_id, sa.role, sa.status, sa.urutan, s.perihal
            FROM surat_approvals sa
            JOIN surat s ON sa.surat_id = s.id
            WHERE sa.status = 'RETURNED'
              AND s.approval_status = 'WAITING_APPROVAL'
        `);

        if (stuckApprovals.length === 0) {
            console.log("No stuck approvals found with 'RETURNED' status.");
            return;
        }

        console.log(`Found ${stuckApprovals.length} stuck steps. Resetting to PENDING...`);
        for (const row of stuckApprovals) {
            console.log(`Resetting approval ID ${row.id} for Surat ID ${row.surat_id} (${row.perihal}) - Role: ${row.role}`);
            await pool.query(`
                UPDATE surat_approvals
                SET status = 'PENDING', signed_at = NULL, reason = NULL
                WHERE id = ?
            `, [row.id]);
        }
        console.log("✅ All stuck approvals successfully reset!");
    } catch (e) {
        console.error("Error resetting stuck approvals:", e);
    } finally {
        process.exit();
    }
}

run();
