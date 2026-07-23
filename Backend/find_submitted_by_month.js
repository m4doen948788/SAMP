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
    let ppQuery = `
      SELECT pp.*, 
             CONCAT(
                 IF(pp.gelar_depan IS NOT NULL AND pp.gelar_depan != '', CONCAT(pp.gelar_depan, ' '), ''),
                 pp.nama,
                 IF(pp.gelar_belakang IS NOT NULL AND pp.gelar_belakang != '', CONCAT(', ', pp.gelar_belakang), '')
             ) as nama_lengkap,
             j.jabatan as jabatan_nama,
             jp.nama as jenis_pegawai_nama
      FROM profil_pegawai pp
      LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
      LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
      WHERE pp.bidang_id = 2 AND pp.is_active = 1
    `;
    const [ppRows] = await pool.query(ppQuery);
    
    const dbPegawaiList = await Promise.all(ppRows.map(async (row) => {
      const [teams] = await pool.query(
        'SELECT sub_bidang_id FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?',
        [row.id]
      );
      return {
        ...row,
        sub_bidang_ids: teams.map(t => t.sub_bidang_id)
      };
    }));

    const eligibleEmployees = dbPegawaiList.filter(p =>
      p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
    );

    // 2. Fetch custom assignments
    const [caRows] = await pool.query('SELECT * FROM skp_custom_assignments WHERE bidang_id = 2');
    const customAssignments = caRows.map(r => {
      let assigned = [];
      if (r.assigned_pegawai_ids) {
        if (typeof r.assigned_pegawai_ids === 'string') {
          try {
            assigned = JSON.parse(r.assigned_pegawai_ids);
          } catch (e) {
            assigned = [];
          }
        }
      }
      return { ...r, assigned_pegawai_ids: assigned };
    });

    const [dbPendukung] = await pool.query(`
      SELECT s.pegawai_id AS pegawaiId, s.bulan, s.butir_skp AS butirSkp, s.doc_name AS docName
      FROM skp_pegawai_docs s
      WHERE s.tahun = 2026 AND s.kategori = 'pendukung'
    `);

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

    const butirSkp = 'Koordinasi Penyusunan Dokumen\nPerencanaan Pembangunan Daerah\nBidang Pemerintahan (RPJPD,\nRPJMD dan RKPD)';
    const customAssign = customAssignments.find(ca => normalizeStr(ca.butir_skp) === normalizeStr(butirSkp));

    const filteredRecords = eligibleEmployees.filter(emp => {
      if (emp.jabatan_nama && /kepala bidang|kabid/i.test(emp.jabatan_nama)) return true;
      if (customAssign) {
        if (customAssign.target_scope === 'individu') {
          return customAssign.assigned_pegawai_ids.map(Number).includes(Number(emp.id));
        } else if (customAssign.target_scope === 'tim' && customAssign.target_id) {
          const extraIds = customAssign.assigned_pegawai_ids.map(Number);
          const isExtra = extraIds.includes(Number(emp.id));
          const pSubBidangIds = emp.sub_bidang_ids.map(Number);
          const isTeam = pSubBidangIds.includes(Number(customAssign.target_id));
          return isTeam || isExtra;
        }
      }
      return true;
    });

    console.log(`--- SUBMISSION MATRIX FOR ${filteredRecords.length} STAFF ---`);
    for (let month = 1; month <= 12; month++) {
      let submitted = [];
      let unsubmitted = [];
      filteredRecords.forEach(emp => {
        const empDocs = dbPendukung.filter(doc => Number(doc.pegawaiId) === Number(emp.id));
        const hasDoc = empDocs.some(doc => 
          matchPendukungDoc(doc, month, butirSkp) && doc.docName !== null && doc.docName !== undefined
        );
        if (hasDoc) {
          submitted.push(emp.nama_lengkap);
        } else {
          unsubmitted.push(emp.nama_lengkap);
        }
      });
      console.log(`\nMonth ${month}: ${submitted.length}/${filteredRecords.length}`);
      if (submitted.length > 0) console.log(`  Submitted (${submitted.length}):`, submitted.join(', '));
      if (unsubmitted.length > 0) console.log(`  Unsubmitted (${unsubmitted.length}):`, unsubmitted.join(', '));
    }

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
