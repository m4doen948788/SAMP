const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // 1. Fetch eligible employees
    const [pegawai] = await pool.query(
      'SELECT pp.id, pp.nama_lengkap, pp.bidang_id, pp.sub_bidang_id, j.jabatan as jabatan_nama ' +
      'FROM profil_pegawai pp ' +
      'LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id ' +
      'LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id ' +
      'WHERE pp.bidang_id = 2 AND pp.is_active = 1 AND (jp.nama = "PNS" OR jp.nama = "PPPK Penuh Waktu")'
    );

    // 2. Fetch team pivot mapping
    const [teamMappingRows] = await pool.query('SELECT profil_pegawai_id, sub_bidang_id FROM profil_pegawai_sub_bidang');
    const teamMappings = {};
    teamMappingRows.forEach(tm => {
      const pid = Number(tm.profil_pegawai_id);
      if (!teamMappings[pid]) teamMappings[pid] = [];
      teamMappings[pid].push(Number(tm.sub_bidang_id));
    });

    // 3. Fetch pendukung docs
    const [pendukung] = await pool.query(
      'SELECT s.pegawai_id AS pegawaiId, s.bulan, s.butir_skp AS butirSkp, s.doc_name AS docName ' +
      'FROM skp_pegawai_docs s ' +
      'LEFT JOIN dokumen_upload d ON s.doc_id = d.id ' +
      'WHERE s.tahun = 2026 AND s.kategori = "pendukung"'
    );

    const normalizeStr = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const matchPendukungDoc = (p, targetBulan, targetButirSkp) => {
      if (!p) return false;
      if (targetBulan !== null && targetBulan !== undefined) {
        if (Number(p.bulan) !== Number(targetBulan)) return false;
      }
      if (targetButirSkp !== null && targetButirSkp !== undefined) {
        const pButir = normalizeStr(p.butirSkp || p.butir_skp);
        const targetButir = normalizeStr(targetButirSkp);
        if (pButir !== targetButir) return false;
      }
      return true;
    };

    const targetButir = 'Koordinasi Penyusunan Dokumen\nPerencanaan Pembangunan Daerah\nBidang Pemerintahan (RPJPD,\nRPJMD dan RKPD)';
    const normTargetButir = normalizeStr(targetButir);

    // 4. Simulate filterRecordsForButirSkp
    const targetSubBidangId = 1; // Tim Pemerintahan
    const filtered = pegawai.filter(p => {
      const jab = (p.jabatan_nama || '').toLowerCase();
      if (jab.includes('kepala bidang') || jab.includes('kabid')) return true;

      const pSubBidangId = Number(p.sub_bidang_id);
      const pSubBidangIds = teamMappings[p.id] || [];
      if (pSubBidangId && !pSubBidangIds.includes(pSubBidangId)) {
        pSubBidangIds.push(pSubBidangId);
      }
      return pSubBidangIds.includes(targetSubBidangId);
    });

    // 5. Calculate submitted & total
    const total = filtered.length;
    const submitted = filtered.filter(p => {
      const empDocs = pendukung.filter(doc => Number(doc.pegawaiId) === Number(p.id));
      const hasDoc = empDocs.some(pDoc => 
        matchPendukungDoc(pDoc, 7, targetButir) && pDoc.docName !== null && pDoc.docName !== undefined
      );
      return hasDoc;
    });

    console.log('--- RATIO RESULT ---');
    console.log(`Submitted: ${submitted.length} / Total: ${total}`);
    console.log('\n--- SUBMITTED EMPLOYEES ---');
    submitted.forEach(p => console.log(`- ${p.nama_lengkap} (ID: ${p.id})`));

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
