const pool = require('../src/config/db');
const { generateHash } = require('../src/utils/cryptoUtils');

async function diagnose() {
    console.log("=== DIAGNOSING VERIFICATION ENDPOINT ERROR ===");
    const slug = '06af5cb8da958903-mos1ozz1';
    
    try {
        console.log("Testing connection...");
        const [connTest] = await pool.query("SELECT 1");
        console.log("Connection OK.");
    } catch (e) {
        console.error("❌ Connection failed:", e.message);
        process.exit(1);
    }

    try {
        console.log("\n1. Testing simple query on 'surat'...");
        const [surat] = await pool.query("SELECT id, perihal, verification_slug, integrity_hash FROM surat WHERE verification_slug = ?", [slug]);
        console.log("Surat query OK. Found:", surat.length);
    } catch (e) {
        console.error("❌ Surat query failed:", e.message);
    }

    try {
        console.log("\n2. Testing query with JOIN on users/profil_pegawai...");
        const [joins] = await pool.query(`
            SELECT s.id, pp_pembuat.nama_lengkap as pembuat_nama
            FROM surat s
            LEFT JOIN users u_pembuat ON s.created_by = u_pembuat.id
            LEFT JOIN profil_pegawai pp_pembuat ON u_pembuat.profil_pegawai_id = pp_pembuat.id
            WHERE s.verification_slug = ?
        `, [slug]);
        console.log("Joins query OK. Found:", joins.length);
    } catch (e) {
        console.error("❌ Joins query failed:", e.message);
    }

    try {
        console.log("\n3. Testing subquery for signers (JSON_ARRAYAGG and JSON_OBJECT)...");
        const [signers] = await pool.query(`
            SELECT sa.role, sa.status, pp.nama_lengkap, mj.jabatan, pp.nip, sa.signed_at
            FROM surat_approvals sa
            JOIN users u ON sa.approver_id = u.id
            JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
            WHERE sa.surat_id = 14
        `);
        console.log("Signers rows query OK. Found:", signers.length);
    } catch (e) {
        console.error("❌ Signers rows query failed:", e.message);
    }

    try {
        console.log("\n4. Testing JSON_ARRAYAGG specifically...");
        const [jsonAgg] = await pool.query(`
            SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'role', sa.role, 
                'status', sa.status
            )) as signers
            FROM surat_approvals sa
            WHERE sa.surat_id = 14
        `);
        console.log("JSON_ARRAYAGG OK. Result:", jsonAgg[0].signers);
    } catch (e) {
        console.error("❌ JSON_ARRAYAGG failed:", e.message);
    }

    try {
        console.log("\n5. Running FULL verification query...");
        const query = `
            SELECT s.id, s.nomor_surat, s.perihal, s.tanggal_surat, s.approval_status, s.isi_surat, s.integrity_hash,
                   pp_pembuat.nama_lengkap as pembuat_nama,
                   COALESCE(
                       (
                           SELECT JSON_ARRAYAGG(JSON_OBJECT(
                               'role', sa.role, 
                               'status', sa.status, 
                               'approver_name', pp.nama_lengkap,
                               'jabatan', mj.jabatan,
                               'nip', pp.nip,
                               'signed_at', sa.signed_at
                           ))
                           FROM surat_approvals sa
                           JOIN users u ON sa.approver_id = u.id
                           JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                           LEFT JOIN master_jabatan mj ON pp.jabatan_id = mj.id
                           WHERE sa.surat_id = s.id
                           ORDER BY sa.urutan DESC
                       ), 
                       JSON_ARRAY()
                   ) as signers
            FROM surat s
            LEFT JOIN users u_pembuat ON s.created_by = u_pembuat.id
            LEFT JOIN profil_pegawai pp_pembuat ON u_pembuat.profil_pegawai_id = pp_pembuat.id
            WHERE s.verification_slug = ?
        `;
        const [rows] = await pool.query(query, [slug]);
        console.log("FULL query OK. Found:", rows.length);
    } catch (e) {
        console.error("❌ FULL query failed:", e.stack);
    }

    process.exit();
}

diagnose();
