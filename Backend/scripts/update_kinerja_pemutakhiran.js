const path = require('path');
const XLSX = require('xlsx');
const pool = require('../src/config/db');

async function updateKinerjaPemutakhiranPrecise() {
  const connection = await pool.getConnection();
  try {
    const excelPath = path.join(__dirname, '../data/Mapping Pemutakhiran Kab Kota pemerintahan.xlsx');
    console.log(`Reading Excel file from: ${excelPath}`);
    
    const wb = XLSX.readFile(excelPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Total raw rows in Excel: ${rawRows.length}`);
    const headers = rawRows[1].map(h => String(h || '').trim().toLowerCase());
    
    const idxBidang = headers.indexOf('kodebidang');
    const idxProgram = headers.indexOf('kodeprogram');
    const idxKegiatan = headers.indexOf('kodekegiatan');
    const idxSub = headers.indexOf('kodesubkegiatan');
    const idxNamaSub = headers.indexOf('uraisubkegiatan');
    const idxKin = headers.indexOf('kinerja');
    const idxInd = headers.indexOf('indikator');
    const idxSat = headers.indexOf('satuan');
    
    const dataRows = rawRows.slice(2);
    
    console.log('Loading database records for precise matching...');
    const [dbData] = await connection.query(`
      SELECT 
        s.id AS sub_id,
        s.kegiatan_id,
        s.kode_sub_kegiatan AS sub_kode,
        s.nama_sub_kegiatan AS sub_nama,
        s.kinerja, s.indikator, s.satuan,
        k.kode_kegiatan,
        k.nama_kegiatan,
        p.kode_program,
        p.nama_program,
        b.kode_urusan AS bidang_kode,
        b.urusan AS bidang_nama
      FROM master_sub_kegiatan s
      JOIN master_kegiatan k ON s.kegiatan_id = k.id
      JOIN master_program p ON k.program_id = p.id
      JOIN master_bidang_urusan b ON p.urusan_id = b.id
    `);
    
    console.log(`Loaded ${dbData.length} records from DB.`);
    const clean = (str) => (str || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    
    const updatesToMake = [];
    let updatedCount = 0;
    
    for (const r of dataRows) {
      if (!r || !r[idxSub]) continue;
      
      const ck = r[idxKegiatan] ? String(r[idxKegiatan]).trim() : '';
      const cs = r[idxSub] ? String(r[idxSub]).trim() : '';
      const namaSub = r[idxNamaSub] ? String(r[idxNamaSub]).trim() : '';
      const kin = r[idxKin] ? String(r[idxKin]).trim() : '';
      const ind = r[idxInd] ? String(r[idxInd]).trim() : '';
      const sat = r[idxSat] ? String(r[idxSat]).trim() : '';
      
      const cleanExName = clean(namaSub);
      const csSuffix = cs.split('.').pop();
      const ckSuffix = ck.split('.').slice(-2).join('.');
      
      // Precise matching hierarchy:
      // 1. Match by exact clean name & csSuffix
      let match = dbData.find(d => clean(d.sub_nama) === cleanExName && (d.sub_kode === csSuffix || d.sub_kode === cs));
      
      // 2. Match by exact clean name
      if (!match) {
        match = dbData.find(d => clean(d.sub_nama) === cleanExName);
      }
      
      // 3. Match by kode_kegiatan suffix & sub_kode suffix
      if (!match) {
        match = dbData.find(d => (d.kode_kegiatan === ckSuffix || d.kode_kegiatan === ck) && (d.sub_kode === csSuffix || d.sub_kode === cs));
      }
      
      if (match) {
        if (match.kinerja !== kin || match.indikator !== ind || match.satuan !== sat) {
          updatesToMake.push({ id: match.sub_id, kin, ind, sat });
        }
        updatedCount++;
      }
    }
    
    console.log(`Total matched sub_kegiatan: ${updatedCount}. Rows to update in DB: ${updatesToMake.length}`);
    
    await connection.beginTransaction();
    console.log('Updating database in bulk chunks...');
    
    const CHUNK_SIZE = 150;
    for (let i = 0; i < updatesToMake.length; i += CHUNK_SIZE) {
      const chunk = updatesToMake.slice(i, i + CHUNK_SIZE);
      const caseKin = chunk.map(u => `WHEN ${u.id} THEN ${connection.escape(u.kin)}`).join(' ');
      const caseInd = chunk.map(u => `WHEN ${u.id} THEN ${connection.escape(u.ind)}`).join(' ');
      const caseSat = chunk.map(u => `WHEN ${u.id} THEN ${connection.escape(u.sat)}`).join(' ');
      const ids = chunk.map(u => u.id).join(',');
      
      const bulkSql = `
        UPDATE master_sub_kegiatan
        SET kinerja = CASE id ${caseKin} END,
            indikator = CASE id ${caseInd} END,
            satuan = CASE id ${caseSat} END,
            updated_at = NOW()
        WHERE id IN (${ids})
      `;
      
      await connection.query(bulkSql);
      console.log(`Updated chunk ${Math.floor(i / CHUNK_SIZE) + 1} / ${Math.ceil(updatesToMake.length / CHUNK_SIZE)}`);
    }
    
    await connection.commit();
    console.log('✅ Precise update completed and committed successfully!');
    connection.release();
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error during precise update:', err);
    connection.release();
    process.exit(1);
  }
}

updateKinerjaPemutakhiranPrecise();
