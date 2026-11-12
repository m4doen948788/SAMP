const path = require('path');
const XLSX = require('xlsx');
const pool = require('../src/config/db');

const EXCEL_PATH = path.join(__dirname, '../data/DATA MAKRO SV.xlsx');

const EXCLUDED_SUB_INDICATORS = new Set([
  // Poin a-e di bawah Indeks Smart City
  'a. baseline',
  'b. output',
  'c. outcome',
  'd. impact',
  'e. quick wins',
  // Poin a-h di bawah Indeks SPBE
  'a. aspek kebijakan internal tata kelola spbe',
  'b. aspek perencanaan strategis spbe',
  'c. aspek teknologi informasi dan komunikasi',
  'd. aspek penyelenggara spbe',
  'e. aspek penerapan manajemen spbe',
  'f. aspek pelaksanaan audit tik',
  'g. aspek layanan administrasi pemerintahan berbasis elektronik',
  'h. aspek layanan publik berbasis elektronik',
]);

const TEMATIK_MAP = {
  'kemiskinan': 2,
  'stunting': 3,
  'germas': 4,
  'kabupaten kota sehat - kks': 5,
  'kabupaten layak anak - kla': 6,
  'tbc': 7,
  'smart city': 8,
  'pengarus utamaan gender - pug': 9,
  'p2wkss': 10,
  'spm': 11,
  'reformasi birokrasi - rb': 12,
  'masterplan / grand design': 13,
  'uhc': 14,
  'gambaran umum': 15,
  'indikator kinerja daerah': 16,
  'pengangguran': 17,
};

const EXISTING_ID_MAP = {
  'indeks pembangunan manusia - ipm': 4,
  'tingkat kemiskinan': 5,
  'prevalensi stunting - ski': 6,
  'jumlah penduduk - bps': 7,
};

function cleanText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNumberId(num) {
  const str = String(num);
  const [intPart, decPart] = str.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const absInt = sign ? intPart.slice(1) : intPart;
  const groupedInt = absInt.length > 3
    ? absInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : absInt;
  return decPart !== undefined
    ? `${sign}${groupedInt},${decPart}`
    : `${sign}${groupedInt}`;
}

function normalizeCellValue(rawVal, indicatorName, year, tipe) {
  if (rawVal === null || rawVal === undefined) return null;

  // Fix known Excel serial date bug in Target row 49 (dd.mm / d.m auto-converted from 17.03 & 19.12)
  if (
    tipe === 'target' &&
    indicatorName.toLowerCase().includes('air siap minum perpipaan') &&
    typeof rawVal === 'number'
  ) {
    if (year === 2025 && rawVal === 45733) return '17,03';
    if (year === 2030 && rawVal === 46010) return '19,12';
  }

  if (typeof rawVal === 'number') {
    if (Number.isNaN(rawVal)) return null;
    return formatNumberId(rawVal);
  }

  const s = cleanText(rawVal);
  if (!s || s === '-') return null;
  if (s.toLowerCase() === 'n/a') return 'N/A';

  // Convert pure dot-decimal string (e.g. "17.88", "66.39") to Indonesian comma decimal
  if (/^-?\d+\.\d+$/.test(s)) {
    const [intPart, decPart] = s.split('.');
    const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${groupedInt},${decPart}`;
  }

  // Normalize numeric range spacing (e.g. "5,09 - 5,64" -> "5,09-5,64")
  if (/^\d+(?:[.,]\d+)?\s*-\s*\d+(?:[.,]\d+)?$/.test(s)) {
    return s.replace(/\s*-\s*/g, '-');
  }

  return s;
}

async function run() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const wsTarget = wb.Sheets['Target'];
  const wsReal = wb.Sheets['Realisasi'];
  if (!wsTarget) throw new Error('Sheet "Target" tidak ditemukan di DATA MAKRO SV.xlsx');
  if (!wsReal) throw new Error('Sheet "Realisasi" tidak ditemukan di DATA MAKRO SV.xlsx');

  const targetRows = XLSX.utils.sheet_to_json(wsTarget, { header: 1, defval: null });
  const realRows = XLSX.utils.sheet_to_json(wsReal, { header: 1, defval: null });

  const targetYears = (targetRows[2] || []).slice(9, 15).map((y) => parseInt(y, 10)).filter((y) => !Number.isNaN(y));
  const realYears = (realRows[2] || []).slice(9, 19).map((y) => parseInt(y, 10)).filter((y) => !Number.isNaN(y));

  // Index Realisasi rows by normalized indicator name
  const realByName = new Map();
  for (let r = 3; r < realRows.length; r++) {
    const row = realRows[r];
    if (!row) continue;
    const namaData = cleanText(row[3]);
    if (!namaData) continue;
    const key = namaData.toLowerCase();
    if (EXCLUDED_SUB_INDICATORS.has(key)) continue;
    realByName.set(key, {
      nama_data: namaData,
      values: realYears.map((yr, idx) => ({
        tahun: yr,
        nilai: normalizeCellValue(row[9 + idx], namaData, yr, 'realisasi'),
      })),
    });
  }

  // Build canonical 68 indicators from Target sheet (excluding Smart City a-e & SPBE a-h)
  const indicators = [];
  for (let r = 3; r < targetRows.length; r++) {
    const row = targetRows[r];
    if (!row) continue;
    const namaData = cleanText(row[3]);
    if (!namaData) continue;
    const key = namaData.toLowerCase();
    if (EXCLUDED_SUB_INDICATORS.has(key)) continue;

    const realEntry = realByName.get(key);
    indicators.push({
      excelRow: r + 1,
      urutan: indicators.length + 1,
      nama_data: namaData,
      tagging: cleanText(row[4]),
      sumber_data: cleanText(row[5]),
      kode: cleanText(row[6]),
      satuan: cleanText(row[8]),
      targets: targetYears.map((yr, idx) => ({
        tahun: yr,
        nilai: normalizeCellValue(row[9 + idx], namaData, yr, 'target'),
      })),
      realisasis: realEntry ? realEntry.values : [],
    });
  }

  console.log(`Target years: ${JSON.stringify(targetYears)}`);
  console.log(`Realisasi years: ${JSON.stringify(realYears)}`);
  console.log(`Total indikator (setelah hapus poin a-e & a-h): ${indicators.length}`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Delete excluded sub-indicators (a-e Smart City, a-h SPBE) and all their linked data
    const [existingMakro] = await conn.query('SELECT id, nama_data, kode FROM data_makro');
    const deletedNames = [];
    for (const row of existingMakro) {
      const key = cleanText(row.nama_data).toLowerCase();
      if (EXCLUDED_SUB_INDICATORS.has(key)) {
        await conn.query('DELETE FROM data_makro_nilai WHERE data_makro_id = ?', [row.id]);
        await conn.query('DELETE FROM data_makro_tematik WHERE data_makro_id = ?', [row.id]);
        await conn.query('DELETE FROM data_makro_pegawai WHERE data_makro_id = ?', [row.id]);
        await conn.query('DELETE FROM data_makro WHERE id = ?', [row.id]);
        deletedNames.push(`${row.id}: ${row.nama_data}`);
      }
    }
    console.log(`Dihapus (${deletedNames.length} sub-indikator):`, deletedNames);

    // 2. Ensure master_satuan has all required units
    const [satuanRows] = await conn.query('SELECT id, satuan FROM master_satuan ORDER BY id ASC');
    const satuanMap = new Map();
    for (const s of satuanRows) {
      const key = cleanText(s.satuan).toLowerCase();
      if (key && !satuanMap.has(key)) {
        satuanMap.set(key, s.id);
      }
    }
    for (const unitName of ['Rp Juta', 'Ton CO2eq / Milyar Rupiah', 'Ton CO2eq']) {
      const key = unitName.toLowerCase();
      if (!satuanMap.has(key)) {
        const [ins] = await conn.query('INSERT INTO master_satuan (satuan) VALUES (?)', [unitName]);
        satuanMap.set(key, ins.insertId);
      }
    }

    // 3. Reload remaining data_makro rows after deletion
    const [remainingMakro] = await conn.query('SELECT id, nama_data, kode FROM data_makro');
    const existingById = new Map(remainingMakro.map((m) => [m.id, m]));
    const existingByName = new Map(remainingMakro.map((m) => [cleanText(m.nama_data).toLowerCase(), m]));

    let updatedCount = 0;
    let insertedCount = 0;
    let targetValuesSaved = 0;
    let realValuesSaved = 0;

    for (const item of indicators) {
      const nameKey = item.nama_data.toLowerCase();
      const satuanId = item.satuan ? (satuanMap.get(item.satuan.toLowerCase()) || null) : null;

      const tematikIds = [];
      if (item.tagging) {
        const parts = item.tagging.split(',').map((p) => cleanText(p).toLowerCase()).filter(Boolean);
        for (const p of parts) {
          if (TEMATIK_MAP[p] && !tematikIds.includes(TEMATIK_MAP[p])) {
            tematikIds.push(TEMATIK_MAP[p]);
          }
        }
      }
      const firstTematikId = tematikIds.length > 0 ? tematikIds[0] : null;

      let makroId = null;
      if (EXISTING_ID_MAP[nameKey] && existingById.has(EXISTING_ID_MAP[nameKey])) {
        makroId = EXISTING_ID_MAP[nameKey];
      } else if (existingByName.has(nameKey)) {
        makroId = existingByName.get(nameKey).id;
      }

      const effectiveKode = item.kode || (makroId === 4 ? 'IPM' : '');

      if (makroId) {
        await conn.query(
          `UPDATE data_makro
           SET kode = ?, nama_data = ?, tematik_id = ?, sumber_data = ?, satuan_id = ?, urutan = ?, parent_id = NULL, is_active = 1
           WHERE id = ?`,
          [effectiveKode, item.nama_data, firstTematikId, item.sumber_data, satuanId, item.urutan, makroId]
        );
        updatedCount++;
      } else {
        const [ins] = await conn.query(
          `INSERT INTO data_makro (kode, nama_data, tematik_id, sumber_data, satuan_id, urutan, parent_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 1)`,
          [effectiveKode, item.nama_data, firstTematikId, item.sumber_data, satuanId, item.urutan]
        );
        makroId = ins.insertId;
        insertedCount++;
      }

      // Sync tematik tags cleanly
      await conn.query('DELETE FROM data_makro_tematik WHERE data_makro_id = ?', [makroId]);
      if (tematikIds.length > 0) {
        await conn.query(
          'INSERT INTO data_makro_tematik (data_makro_id, tematik_id) VALUES ?',
          [tematikIds.map((tid) => [makroId, tid])]
        );
      }

      // Sync Target values (2025-2030)
      await conn.query(
        'DELETE FROM data_makro_nilai WHERE data_makro_id = ? AND tipe = ?',
        [makroId, 'target']
      );
      const targetInserts = item.targets
        .filter((t) => t.nilai !== null && t.nilai !== '')
        .map((t) => [makroId, t.tahun, 'target', t.nilai]);
      if (targetInserts.length > 0) {
        await conn.query(
          'INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai) VALUES ?',
          [targetInserts]
        );
        targetValuesSaved += targetInserts.length;
      }

      // Sync Realisasi values (2016-2025) from sheet Realisasi for this Target indicator
      await conn.query(
        'DELETE FROM data_makro_nilai WHERE data_makro_id = ? AND tipe = ?',
        [makroId, 'realisasi']
      );
      const realInserts = item.realisasis
        .filter((r) => r.nilai !== null && r.nilai !== '')
        .map((r) => [makroId, r.tahun, 'realisasi', r.nilai]);
      if (realInserts.length > 0) {
        await conn.query(
          'INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai) VALUES ?',
          [realInserts]
        );
        realValuesSaved += realInserts.length;
      }
    }

    await conn.commit();
    console.log('✅ Sinkronisasi Data Makro selesai:');
    console.log(`   - Sub-indikator dihapus (a-e & a-h): ${deletedNames.length}`);
    console.log(`   - Indikator diupdate               : ${updatedCount}`);
    console.log(`   - Indikator baru                   : ${insertedCount}`);
    console.log(`   - Total indikator aktif            : ${indicators.length}`);
    console.log(`   - Nilai Target tersimpan           : ${targetValuesSaved}`);
    console.log(`   - Nilai Realisasi tersimpan        : ${realValuesSaved}`);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Sinkronisasi gagal, transaksi di-rollback:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit();
  }
}

run();
