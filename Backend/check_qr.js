const pool = require('./src/config/db');

async function main() {
  // Check ALL surat and their verification slugs
  const [rows] = await pool.query(
    `SELECT id, perihal, verification_slug,
     CASE WHEN isi_surat IS NOT NULL AND isi_surat != '' THEN 'has_isi_surat' ELSE 'no_isi_surat' END as isi_status,
     CASE WHEN isi_surat LIKE '%qrserver%' THEN 'has_qr_in_isi' ELSE 'no_qr_in_isi' END as qr_status,
     CASE WHEN isi_surat LIKE '%bapperida%' THEN 'HAS_BAPPERIDA' ELSE 'no_bapperida' END as bapperida_status,
     CASE WHEN isi_surat LIKE '%localhost%' THEN 'has_localhost' ELSE 'no_localhost' END as localhost_status
     FROM surat ORDER BY id DESC LIMIT 20`
  );

  rows.forEach(r => {
    console.log(`ID: ${r.id} | ${(r.perihal || '').substring(0, 30)} | slug: ${r.verification_slug || 'NO_SLUG'} | ${r.isi_status} | ${r.qr_status} | ${r.bapperida_status} | ${r.localhost_status}`);
  });

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
