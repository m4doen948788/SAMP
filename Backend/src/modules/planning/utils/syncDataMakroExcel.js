const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '../../../../data/DATA MAKRO SV.xlsx');

const EXCLUDED_SUB_INDICATORS = new Set([
  'a. baseline',
  'b. output',
  'c. outcome',
  'd. impact',
  'e. quick wins',
  'a. aspek kebijakan internal tata kelola spbe',
  'b. aspek perencanaan strategis spbe',
  'c. aspek teknologi informasi dan komunikasi',
  'd. aspek penyelenggara spbe',
  'e. aspek penerapan manajemen spbe',
  'f. aspek pelaksanaan audit tik',
  'g. aspek layanan administrasi pemerintahan berbasis elektronik',
  'h. aspek layanan publik berbasis elektronik',
]);

// Map tematik name (lowercase) -> existing master_tematik.nama patterns
const TEMATIK_NAME_MATCHERS = {
  'kemiskinan': ['kemiskinan'],
  'stunting': ['stunting'],
  'germas': ['germas'],
  'kabupaten kota sehat - kks': ['kabupaten kota sehat', 'kks'],
  'kabupaten layak anak - kla': ['kabupaten layak anak', 'kla'],
  'tbc': ['tuberculosis', 'tbc'],
  'smart city': ['smart city'],
  'pengarus utamaan gender - pug': ['pengarus utamaan gender', 'pug'],
  'p2wkss': ['p2wkss'],
  'spm': ['spm'],
  'reformasi birokrasi - rb': ['reformasi birokrasi', 'rb'],
  'masterplan / grand design': ['masterplan'],
  'uhc': ['universal health coverage', 'uhc'],
  'gambaran umum': ['gambaran umum'],
  'indikator kinerja daerah': ['indikator kinerja daerah'],
  'pengangguran': ['pengangguran'],
};

const EXISTING_ID_MATCHERS = [
  { nameKey: 'indeks pembangunan manusia - ipm', match: (r) => r.id === 4 || (r.kode || '').toUpperCase() === 'IPM' || cleanText(r.nama_data).toLowerCase().includes('indeks pembangunan manusia') },
  { nameKey: 'tingkat kemiskinan', match: (r) => r.id === 5 || cleanText(r.nama_data).toLowerCase() === 'persentase penduduk miskin' || cleanText(r.nama_data).toLowerCase() === 'tingkat kemiskinan' },
  { nameKey: 'prevalensi stunting - ski', match: (r) => r.id === 6 || cleanText(r.nama_data).toLowerCase() === 'prevalensi stunting' || cleanText(r.nama_data).toLowerCase() === 'prevalensi stunting - ski' },
  { nameKey: 'jumlah penduduk - bps', match: (r) => r.id === 7 || cleanText(r.nama_data).toLowerCase() === 'jumlah penduduk' || cleanText(r.nama_data).toLowerCase() === 'jumlah penduduk - bps' },
];

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

  if (/^-?\d+\.\d+$/.test(s)) {
    const [intPart, decPart] = s.split('.');
    const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${groupedInt},${decPart}`;
  }

  if (/^\d+(?:[.,]\d+)?\s*-\s*\d+(?:[.,]\d+)?$/.test(s)) {
    return s.replace(/\s*-\s*/g, '-');
  }

  return s;
}

async function syncDataMakroFromExcel(pool) {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.warn('[DataMakro Sync] Excel file not found:', EXCEL_PATH);
    return { skipped: true, reason: 'file_not_found' };
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  const wsTarget = wb.Sheets['Target'];
  const wsReal = wb.Sheets['Realisasi'];
  if (!wsTarget || !wsReal) {
    throw new Error('Sheet "Target" atau "Realisasi" tidak ditemukan di DATA MAKRO SV.xlsx');
  }

  const targetRows = XLSX.utils.sheet_to_json(wsTarget, { header: 1, defval: null });
  const realRows = XLSX.utils.sheet_to_json(wsReal, { header: 1, defval: null });

  const targetYears = (targetRows[2] || []).slice(9, 15).map((y) => parseInt(y, 10)).filter((y) => !Number.isNaN(y));
  const realYears = (realRows[2] || []).slice(9, 19).map((y) => parseInt(y, 10)).filter((y) => !Number.isNaN(y));

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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Delete excluded sub-indicators (a-e Smart City, a-h SPBE)
    const [existingMakro] = await conn.query('SELECT id, nama_data, kode FROM data_makro');
    let deletedCount = 0;
    for (const row of existingMakro) {
      const key = cleanText(row.nama_data).toLowerCase();
      if (EXCLUDED_SUB_INDICATORS.has(key)) {
        await conn.query('DELETE FROM data_makro_nilai WHERE data_makro_id = ?', [row.id]);
        await conn.query('DELETE FROM data_makro_tematik WHERE data_makro_id = ?', [row.id]);
        await conn.query('DELETE FROM data_makro_pegawai WHERE data_makro_id = ?', [row.id]);
        await conn.query('DELETE FROM data_makro WHERE id = ?', [row.id]);
        deletedCount++;
      }
    }

    // 2. Resolve master_satuan dynamically
    const [satuanRows] = await conn.query('SELECT id, satuan FROM master_satuan ORDER BY id ASC');
    const satuanMap = new Map();
    for (const s of satuanRows) {
      const key = cleanText(s.satuan).toLowerCase();
      if (key && !satuanMap.has(key)) satuanMap.set(key, s.id);
    }
    for (const unitName of ['KM2', 'Jiwa', 'Poin', 'Persen', 'Predikat', 'Tahun', 'Kategori', 'Rp Juta', 'Ton CO2eq / Milyar Rupiah', 'Ton CO2eq']) {
      const key = unitName.toLowerCase();
      if (!satuanMap.has(key)) {
        const [ins] = await conn.query('INSERT INTO master_satuan (satuan) VALUES (?)', [unitName]);
        satuanMap.set(key, ins.insertId);
      }
    }

    // 3. Resolve master_tematik dynamically by name (works even if IDs differ between localhost and VPS)
    const [tematikRows] = await conn.query('SELECT id, nama FROM master_tematik ORDER BY id ASC');
    const resolveTematikId = async (tagLower) => {
      const patterns = TEMATIK_NAME_MATCHERS[tagLower] || [tagLower];
      const matched = tematikRows.find((t) => {
        const tn = cleanText(t.nama).toLowerCase();
        return patterns.some((p) => tn.includes(p));
      });
      if (matched) return matched.id;
      const prettyName = tagLower.replace(/\b\w/g, (c) => c.toUpperCase());
      const [ins] = await conn.query('INSERT INTO master_tematik (nama) VALUES (?)', [prettyName]);
      tematikRows.push({ id: ins.insertId, nama: prettyName });
      return ins.insertId;
    };

    // 4. Reload remaining data_makro rows
    const [remainingMakro] = await conn.query('SELECT id, nama_data, kode FROM data_makro');
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
          const tid = await resolveTematikId(p);
          if (tid && !tematikIds.includes(tid)) tematikIds.push(tid);
        }
      }
      const firstTematikId = tematikIds.length > 0 ? tematikIds[0] : null;

      let makroId = null;
      if (existingByName.has(nameKey)) {
        makroId = existingByName.get(nameKey).id;
      } else {
        const legacyRule = EXISTING_ID_MATCHERS.find((m) => m.nameKey === nameKey);
        if (legacyRule) {
          const legacyRow = remainingMakro.find((r) => legacyRule.match(r));
          if (legacyRow) makroId = legacyRow.id;
        }
      }

      const effectiveKode = item.kode || (nameKey === 'indeks pembangunan manusia - ipm' ? 'IPM' : '');

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

      await conn.query('DELETE FROM data_makro_tematik WHERE data_makro_id = ?', [makroId]);
      if (tematikIds.length > 0) {
        await conn.query(
          'INSERT INTO data_makro_tematik (data_makro_id, tematik_id) VALUES ?',
          [tematikIds.map((tid) => [makroId, tid])]
        );
      }

      await conn.query('DELETE FROM data_makro_nilai WHERE data_makro_id = ? AND tipe = ?', [makroId, 'target']);
      const targetInserts = item.targets
        .filter((t) => t.nilai !== null && t.nilai !== '')
        .map((t) => [makroId, t.tahun, 'target', t.nilai]);
      if (targetInserts.length > 0) {
        await conn.query('INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai) VALUES ?', [targetInserts]);
        targetValuesSaved += targetInserts.length;
      }

      await conn.query('DELETE FROM data_makro_nilai WHERE data_makro_id = ? AND tipe = ?', [makroId, 'realisasi']);
      const realInserts = item.realisasis
        .filter((r) => r.nilai !== null && r.nilai !== '')
        .map((r) => [makroId, r.tahun, 'realisasi', r.nilai]);
      if (realInserts.length > 0) {
        await conn.query('INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai) VALUES ?', [realInserts]);
        realValuesSaved += realInserts.length;
      }
    }

    await conn.commit();
    return {
      skipped: false,
      deletedCount,
      updatedCount,
      insertedCount,
      totalIndicators: indicators.length,
      targetValuesSaved,
      realValuesSaved,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { syncDataMakroFromExcel };
