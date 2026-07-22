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

    // 1. Fetch profiles like profilPegawaiController.getAll
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
    
    // Map sub_bidang_ids
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

    // Filter to PNS/PPPK Penuh Waktu
    const eligibleEmployees = dbPegawaiList.filter(p =>
      p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
    );

    // 2. Fetch getPegawaiRecords(2026, 2)
    const [dbRecords] = await pool.query(`
        SELECT 
            s.pegawai_id AS pegawaiId,
            MAX(CASE WHEN s.kategori = 'perencanaan' THEN s.doc_name END) AS perencanaanDocName
        FROM skp_pegawai_docs s
        WHERE s.tahun = 2026
        GROUP BY s.pegawai_id
    `);

    const [dbPendukung] = await pool.query(`
        SELECT 
            s.pegawai_id AS pegawaiId,
            s.bulan,
            s.butir_skp AS butirSkp,
            s.doc_name AS docName,
            s.doc_id AS docId
        FROM skp_pegawai_docs s
        WHERE s.tahun = 2026 AND s.kategori = 'pendukung'
    `);

    // 3. Map into PegawaiSkpRecord
    const records = eligibleEmployees.map(emp => {
      const dbRow = dbRecords.find((r) => Number(r.pegawaiId) === Number(emp.id)) || null;
      const empPendukung = dbPendukung.filter((p) => Number(p.pegawaiId) === Number(emp.id));
      
      return {
        pegawaiId: Number(emp.id),
        namaPegawai: emp.nama_lengkap || emp.nama,
        jabatan: emp.jabatan_nama || 'Fungsional Umum',
        bidangId: Number(emp.bidang_id),
        pendukungList: empPendukung
      };
    });

    // 4. Fetch custom assignments
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
        } else if (Array.isArray(r.assigned_pegawai_ids)) {
          assigned = r.assigned_pegawai_ids;
        }
      }
      return {
        ...r,
        assigned_pegawai_ids: assigned
      };
    });

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

    const filterRecordsForButirSkp = (recs, butirSkp) => {
      if (!butirSkp || recs.length === 0) return [];
      const normButirSkp = normalizeStr(butirSkp);
      
      const customAssign = customAssignments.find(
        ca => normalizeStr(ca.butir_skp) === normButirSkp
      );

      return recs.filter(r => {
        const p = dbPegawaiList.find(x => Number(x.id) === Number(r.pegawaiId));

        if (p) {
          const jab = (p.jabatan_nama || p.jabatan || '').toLowerCase();
          if (jab.includes('kepala bidang') || jab.includes('kabid')) {
            return true;
          }
        }

        if (customAssign) {
          if (customAssign.target_scope === 'individu') {
            const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids)
              ? customAssign.assigned_pegawai_ids.map(Number)
              : [];
            if (!assignedIds.includes(Number(r.pegawaiId))) return false;
          } else if (customAssign.target_scope === 'tim' && customAssign.target_id) {
            const extraIds = Array.isArray(customAssign.assigned_pegawai_ids)
              ? customAssign.assigned_pegawai_ids.map(Number)
              : [];
            const isExtraMember = extraIds.includes(Number(r.pegawaiId));

            if (p) {
              const pSubBidangId = Number(p.sub_bidang_id);
              const pSubBidangIds = Array.isArray(p.sub_bidang_ids)
                ? p.sub_bidang_ids.map(Number)
                : (pSubBidangId ? [pSubBidangId] : []);
              const isTeamMember = pSubBidangIds.includes(Number(customAssign.target_id));
              if (!isTeamMember && !isExtraMember) return false;
            } else if (!isExtraMember) {
              return false;
            }
          }
        }
        return true;
      });
    };

    const butirSkp = 'Koordinasi Penyusunan Dokumen\nPerencanaan Pembangunan Daerah\nBidang Pemerintahan (RPJPD,\nRPJMD dan RKPD)';
    const filteredRecords = filterRecordsForButirSkp(records, butirSkp);
    
    console.log('--- FRONTEND SIMULATION WITH CUSTOM ASSIGNMENTS ---');
    console.log('Filtered Records Count:', filteredRecords.length);
    let submittedCount = 0;
    filteredRecords.forEach(r => {
      const hasDoc = r.pendukungList?.some((p) => 
        matchPendukungDoc(p, 7, butirSkp) && p.docName !== null && p.docName !== undefined
      );
      if (hasDoc) submittedCount++;
      console.log(`- ${r.namaPegawai} (ID: ${r.pegawaiId}) | Has Doc: ${hasDoc}`);
    });
    console.log(`Total Ratio: ${submittedCount}/${filteredRecords.length}`);

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
