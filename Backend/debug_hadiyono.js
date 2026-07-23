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

    const [dbPendukung] = await pool.query(`
      SELECT s.pegawai_id AS pegawaiId, s.bulan, s.butir_skp AS butirSkp, s.doc_name AS docName
      FROM skp_pegawai_docs s
      WHERE s.tahun = 2026 AND s.kategori = 'pendukung' AND s.pegawai_id = 43
    `);

    console.log('Hadiyono pendukung rows:', dbPendukung);

    const normalizeStr = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const matchPendukungDoc = (p, targetBulan, targetButirSkp) => {
      console.log(`Checking doc for month ${targetBulan}:`, p);
      if (!p) {
        console.log('  p is null');
        return false;
      }
      if (targetBulan !== null && targetBulan !== undefined) {
        console.log(`  Comparing month: Number(${p.bulan}) !== Number(${targetBulan}) -> ${Number(p.bulan) !== Number(targetBulan)}`);
        if (Number(p.bulan) !== Number(targetBulan)) return false;
      }
      if (targetButirSkp !== null && targetButirSkp !== undefined) {
        const pButir = normalizeStr(p.butirSkp || p.butir_skp);
        const targetButir = normalizeStr(targetButirSkp);
        console.log(`  Comparing butir: "${pButir}" !== "${targetButir}" -> ${pButir !== targetButir}`);
        if (pButir !== targetButir) return false;
      }
      console.log('  Match found!');
      return true;
    };

    const butirSkp = 'Koordinasi Penyusunan Dokumen\nPerencanaan Pembangunan Daerah\nBidang Pemerintahan (RPJPD,\nRPJMD dan RKPD)';

    for (let m = 1; m <= 12; m++) {
      const hasDoc = dbPendukung.some(doc => 
        matchPendukungDoc(doc, m, butirSkp) && doc.docName !== null && doc.docName !== undefined
      );
      console.log(`Month ${m} result: ${hasDoc}`);
    }

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
