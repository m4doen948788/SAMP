const xlsx = require('xlsx');
const pool = require('../../../config/db');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Inisialisasi global cache memory untuk menyimpan baris data excel hasil parsing
if (!global.excelCache) {
  global.excelCache = new Map();
}

/**
 * Helper untuk menghapus file temporary olah_data_* dan cache memori yang sudah berusia lebih dari 2 jam.
 */
async function cleanupOldTempFiles() {
  try {
    const tempDir = os.tmpdir();
    const files = await fs.promises.readdir(tempDir);
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 jam

    for (const file of files) {
      if (file.startsWith('olah_data_')) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > maxAge) {
          await fs.promises.unlink(filePath).catch(() => {});
        }
      }
    }

    // Bersihkan cache memori RAM
    for (const [key, value] of global.excelCache.entries()) {
      if (now - value.lastAccessed > maxAge) {
        global.excelCache.delete(key);
        console.log(`[Memory Cache] Cleaned up expired cache key: ${key}`);
      }
    }
  } catch (err) {
    console.error('[OlahDataController] Error during temp file cleanup:', err);
  }
}

/**
 * Helper untuk meratakan baris kosong pada struktur Excel bergaya tangga (Hierarki / Outline).
 * Menyalin turun (forward-fill) nilai non-kosong terakhir untuk kolom yang sama.
 */
function applyFillDown(dataRows) {
  const lastNonEmptyValues = {};
  dataRows.forEach(row => {
    if (!row || row.length === 0) return;
    
    // Cek jika seluruh sel di baris ini kosong
    const isRowEmpty = row.every(cell => cell === undefined || cell === null || cell.toString().trim() === '');
    if (isRowEmpty) return;

    // Lakukan pengisian menyamping/menurun ke bawah
    row.forEach((cell, colIdx) => {
      const valStr = cell !== undefined && cell !== null ? cell.toString().trim() : '';
      if (valStr !== '') {
        lastNonEmptyValues[colIdx] = cell;
      } else {
        if (lastNonEmptyValues[colIdx] !== undefined) {
          row[colIdx] = lastNonEmptyValues[colIdx];
        }
      }
    });
  });
}

/**
 * Helper untuk memuat data dari Cache RAM jika tersedia, atau mengurai dan menyimpannya ke Cache jika Miss.
 */
async function getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, fileBuffer) {
  const cacheKey = `${tempFileName || 'upload'}||${selectedSheetName}`;
  const hRow = parseInt(headerRowIndex, 10);

  if (tempFileName && global.excelCache.has(cacheKey)) {
    const cached = global.excelCache.get(cacheKey);
    cached.lastAccessed = Date.now();
    
    if (isFillDown) {
      if (!cached.filledRows) {
        // Kloning rawRows untuk mencegah polusi cache asli (karena fillDown merubah data secara langsung)
        const clonedRows = JSON.parse(JSON.stringify(cached.rawRows));
        const slicedData = clonedRows.slice(hRow + 1);
        applyFillDown(slicedData);
        cached.filledRows = {
          slicedData: slicedData,
          headerRow: clonedRows[hRow] || []
        };
      }
      return {
        dataRows: cached.filledRows.slicedData,
        headerRow: cached.filledRows.headerRow,
        rawRows: cached.rawRows
      };
    } else {
      const slicedData = cached.rawRows.slice(hRow + 1);
      return {
        dataRows: slicedData,
        headerRow: cached.rawRows[hRow] || [],
        rawRows: cached.rawRows
      };
    }
  }

  // Jika cache miss, baca buffer
  if (!fileBuffer) {
    throw new Error('Berkas tidak ditemukan dalam memori cache dan tidak ada buffer file yang dikirim.');
  }

  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const actualSheetName = selectedSheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[actualSheetName];
  if (!sheet) {
    throw new Error(`Sheet '${actualSheetName}' tidak ditemukan.`);
  }

  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Simpan ke memory cache
  if (tempFileName) {
    global.excelCache.set(cacheKey, {
      rawRows,
      filledRows: null,
      lastAccessed: Date.now()
    });
    console.log(`[Memory Cache] Cache initialized for key: ${cacheKey}`);
  }

  const clonedRows = JSON.parse(JSON.stringify(rawRows));
  const dataRows = clonedRows.slice(hRow + 1);

  if (isFillDown) {
    applyFillDown(dataRows);
  }

  return {
    dataRows,
    headerRow: rawRows[hRow] || [],
    rawRows
  };
}

async function resolveFileBufferAndRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown) {
  const cacheKey = `${tempFileName || 'upload'}||${selectedSheetName}`;
  if (tempFileName && global.excelCache.has(cacheKey)) {
    return await getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, null);
  }
  
  let fileBuffer;
  if (tempFileName) {
    const safeFileName = tempFileName.replace(/[^a-zA-Z0-9_.-]/g, '');
    const tempFilePath = path.join(os.tmpdir(), safeFileName);
    if (fs.existsSync(tempFilePath)) {
      fileBuffer = await fs.promises.readFile(tempFilePath);
    }
  }
  
  if (!fileBuffer) {
    throw new Error(`File ${tempFileName || ''} tidak ditemukan atau sudah kadaluarsa.`);
  }
  
  return await getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, fileBuffer);
}

function formatRupiahColumns(sheet, isRingkasan = false) {
  if (!sheet || !sheet['!ref']) return;
  const range = xlsx.utils.decode_range(sheet['!ref']);
  
  if (isRingkasan) {
    for (let R = 10; R <= range.e.r; ++R) {
      for (const C of [2, 3, 4]) {
        const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellRef];
        if (cell && cell.t === 'n') {
          cell.z = '"Rp"#,##0;("Rp"#,##0);"-"';
        }
      }
    }
  } else {
    const paguCols = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = xlsx.utils.encode_cell({ r: range.s.r, c: C });
      const cell = sheet[cellRef];
      if (cell && cell.v) {
        const headerText = String(cell.v).toUpperCase();
        if (headerText.includes('PAGU') || headerText.includes('SELISIH') || headerText.includes('ANGGARAN') || headerText.includes('JUMLAH')) {
          paguCols.push(C);
        }
      }
    }

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (const C of paguCols) {
        const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellRef];
        if (cell && cell.t === 'n') {
          cell.z = '"Rp"#,##0;("Rp"#,##0);"-"';
        }
      }
    }
  }
}

/**
 * Controller untuk pengolahan data Excel secara dinamis.
 */
class OlahDataController {
  
  /**
   * Menginspeksi file Excel yang diunggah untuk mendapatkan daftar sheet
   * dan baris-baris pertama (untuk preview di frontend).
   * File disimpan sementara di os.tmpdir() untuk mempercepat filtering berjenjang.
   */
  async inspectExcel(req, res) {
    try {
      let fileBuffer;
      let originalName = '';

      if (req.file) {
        fileBuffer = req.file.buffer;
        originalName = req.file.originalname;
      } else if (req.body.libraryFilePath) {
        let cleanPath = req.body.libraryFilePath.replace(/^\/?uploads\//, '');
        cleanPath = path.basename(cleanPath);
        const absolutePath = path.join(__dirname, '../../../../uploads', cleanPath);
        if (fs.existsSync(absolutePath)) {
          fileBuffer = await fs.promises.readFile(absolutePath);
          originalName = cleanPath;
        } else {
          return res.status(404).json({ success: false, message: 'Berkas perpustakaan tidak ditemukan di server.' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah atau dipilih dari perpustakaan.' });
      }

      // Bersihkan file temp lama
      cleanupOldTempFiles().catch(() => {});

      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        return res.status(400).json({ success: false, message: 'Excel tidak memiliki sheet.' });
      }

      const selectedSheetName = req.body.sheetName || sheetNames[0];
      const sheet = workbook.Sheets[selectedSheetName];
      
      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const previewRows = rawRows.slice(0, 40);

      // Simpan file ke direktori temporary
      const userId = req.user ? req.user.id : 'anon';
      const tempFileName = `olah_data_${userId}_${Date.now()}.xlsx`;
      const tempFilePath = path.join(os.tmpdir(), tempFileName);
      await fs.promises.writeFile(tempFilePath, fileBuffer);

      // Pre-cache the rawRows immediately!
      const cacheKey = `${tempFileName}||${selectedSheetName}`;
      global.excelCache.set(cacheKey, {
        rawRows,
        filledRows: null,
        lastAccessed: Date.now()
      });
      console.log(`[Memory Cache] Pre-cached parsed rows for key: ${cacheKey}`);

      return res.json({
        success: true,
        sheetNames,
        selectedSheetName,
        previewRows,
        tempFileName // Berikan nama file temp ke frontend
      });
    } catch (err) {
      console.error('[OlahDataController] inspectExcel error:', err);
      return res.status(500).json({ success: false, message: 'Gagal menginspeksi file Excel.', error: err.message });
    }
  }

  /**
   * Mengambil daftar nilai unik pada suatu kolom tertentu di Excel.
   * Mendukung pembacaan dari file temp untuk efisiensi request.
   */
  async getUniqueValues(req, res) {
    try {
      const {
        sheetName,
        headerRowIndex = 0,
        colIdx,
        activeFilters,
        fillDown,
        tempFileName
      } = req.body;

      const colIndex = parseInt(colIdx, 10);
      if (isNaN(colIndex) || colIndex < 0) {
        return res.status(400).json({ success: false, message: 'Indeks kolom tidak valid.' });
      }

      let parsedFilters = {};
      if (activeFilters) {
        try {
          parsedFilters = typeof activeFilters === 'string' 
            ? JSON.parse(activeFilters) 
            : activeFilters;
        } catch (e) {
          console.error('[OlahDataController] Failed to parse activeFilters:', e);
        }
      }

      const selectedSheetName = sheetName || 'Sheet1';
      const isFillDown = fillDown === 'true' || fillDown === true;
      const cacheKey = `${tempFileName || 'upload'}||${selectedSheetName}`;

      let dataRows;
      if (tempFileName && global.excelCache.has(cacheKey)) {
        // Mengambil langsung dari memori RAM (0ms)
        const result = await getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, null);
        dataRows = result.dataRows;
      } else {
        // Cache miss: baca file dari disk
        let fileBuffer;
        if (req.file) {
          fileBuffer = req.file.buffer;
        } else if (tempFileName) {
          const safeFileName = tempFileName.replace(/[^a-zA-Z0-9_.-]/g, '');
          const tempFilePath = path.join(os.tmpdir(), safeFileName);
          if (fs.existsSync(tempFilePath)) {
            fileBuffer = await fs.promises.readFile(tempFilePath);
          } else {
            return res.status(400).json({ success: false, message: 'Berkas sementara kadaluarsa, silakan unggah kembali file.' });
          }
        } else {
          return res.status(400).json({ success: false, message: 'Tidak ada berkas yang ditemukan.' });
        }

        const result = await getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, fileBuffer);
        dataRows = result.dataRows;
      }

      const uniqueVals = new Set();

      dataRows.forEach(row => {
        if (!row || row.length <= colIndex) return;

        // Terapkan filter dari kolom-kolom sebelumnya jika ada
        let matches = true;
        Object.keys(parsedFilters).forEach(key => {
          const filterColIdx = parseInt(key, 10);
          const allowedValues = parsedFilters[key];
          if (allowedValues && Array.isArray(allowedValues)) {
            const cellVal = row[filterColIdx] !== undefined && row[filterColIdx] !== null ? row[filterColIdx].toString().trim() : '';
            if (!allowedValues.includes(cellVal)) {
              matches = false;
            }
          }
        });

        if (!matches) return; // Lewati baris jika tidak cocok filter kolom sebelumnya

        const cell = row[colIndex];
        const val = cell !== undefined && cell !== null ? cell.toString().trim() : '';
        uniqueVals.add(val);
      });

      const sortedValues = Array.from(uniqueVals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      return res.json({
        success: true,
        values: sortedValues
      });
    } catch (err) {
      console.error('[OlahDataController] getUniqueValues error:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil nilai unik kolom.', error: err.message });
    }
  }

  /**
   * Mengambil daftar template pemetaan yang disimpan oleh pengguna saat ini.
   */
  async getTemplates(req, res) {
    try {
      const userId = req.user.id;
      const [rows] = await pool.query(
        'SELECT id, name, type, config, created_at FROM olah_data_templates WHERE user_id = ? ORDER BY id DESC',
        [userId]
      );
      return res.json({ success: true, data: rows });
    } catch (err) {
      console.error('[OlahDataController] getTemplates error:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar template.', error: err.message });
    }
  }

  /**
   * Menyimpan konfigurasi pemetaan baru sebagai template milik pengguna saat ini.
   */
  async saveTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { name, type, config } = req.body;

      if (!name || !config) {
        return res.status(400).json({ success: false, message: 'Nama template dan konfigurasi wajib diisi.' });
      }

      const configStr = typeof config === 'string' ? config : JSON.stringify(config);

      const [result] = await pool.query(
        'INSERT INTO olah_data_templates (user_id, name, type, config) VALUES (?, ?, ?, ?)',
        [userId, name, type || 'geografis', configStr]
      );

      return res.json({
        success: true,
        message: 'Template berhasil disimpan.',
        templateId: result.insertId
      });
    } catch (err) {
      console.error('[OlahDataController] saveTemplate error:', err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan template.', error: err.message });
    }
  }

  /**
   * Menghapus template milik pengguna saat ini berdasarkan ID.
   */
  async deleteTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const [result] = await pool.query(
        'DELETE FROM olah_data_templates WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Template tidak ditemukan atau bukan milik Anda.' });
      }

      return res.json({ success: true, message: 'Template berhasil dihapus.' });
    } catch (err) {
      console.error('[OlahDataController] deleteTemplate error:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus template.', error: err.message });
    }
  }

  /**
   * Memproses file Excel secara dinamis berdasarkan pemetaan kolom,
   * lalu mengembalikan file Excel hasil rekapitulasi.
   * Mendukung pembacaan dari file temp/cache untuk efisiensi request.
   */
  async processExcel(req, res) {
    try {
      const {
        sheetName,
        headerRowIndex = 0,
        mode = 'geografis', // 'geografis' atau 'manual'
        fillDown,          // 'true' atau true untuk meratakan hierarki
        provinsiColIdx,
        kabupatenColIdx,
        kecamatanColIdx,
        desaColIdx,
        alamatColIdx,
        filterKabupaten,
        // Kolom filter objek utama (Opsional untuk geografis)
        objekColIdx,
        objekValue,
        // Kolom pengelompokan kustom & filter kriterianya (Wajib untuk manual)
        customGroupCols,
        customGroupFilters,
        tempFileName
      } = req.body;

      const hRow = parseInt(headerRowIndex, 10);
      const selectedSheetName = sheetName || 'Sheet1';
      const isFillDown = fillDown === 'true' || fillDown === true;
      const cacheKey = `${tempFileName || 'upload'}||${selectedSheetName}`;

      let dataRows;
      let headerRow;
      let rawRows;

      if (tempFileName && global.excelCache.has(cacheKey)) {
        // Mengambil langsung dari memori RAM (0ms)
        const result = await getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, null);
        dataRows = result.dataRows;
        headerRow = result.headerRow;
        rawRows = result.rawRows;
      } else {
        // Cache miss: baca file dari disk
        let fileBuffer;
        if (req.file) {
          fileBuffer = req.file.buffer;
        } else if (tempFileName) {
          const safeFileName = tempFileName.replace(/[^a-zA-Z0-9_.-]/g, '');
          const tempFilePath = path.join(os.tmpdir(), safeFileName);
          if (fs.existsSync(tempFilePath)) {
            fileBuffer = await fs.promises.readFile(tempFilePath);
          } else {
            return res.status(400).json({ success: false, message: 'Berkas sementara kadaluarsa, silakan unggah kembali file.' });
          }
        } else {
          return res.status(400).json({ success: false, message: 'Tidak ada berkas yang ditemukan.' });
        }

        const result = await getCachedRows(tempFileName, selectedSheetName, headerRowIndex, isFillDown, fileBuffer);
        dataRows = result.dataRows;
        headerRow = result.headerRow;
        rawRows = result.rawRows;
      }

      // ==========================================
      // MODE 1: REKAPITULASI MANUAL (CUSTOM GROUPING)
      // ==========================================
      if (mode === 'manual') {
        let groupCols = [];
        if (customGroupCols) {
          groupCols = customGroupCols.toString().split(',')
            .map(x => parseInt(x.trim(), 10))
            .filter(x => !isNaN(x) && x >= 0);
        }

        if (groupCols.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Harap pilih minimal satu kolom untuk dikelompokkan pada mode rekap manual.'
          });
        }

        // Parse filter kriteria per kolom (jika ada)
        let groupFilters = {};
        if (customGroupFilters) {
          try {
            groupFilters = typeof customGroupFilters === 'string' 
              ? JSON.parse(customGroupFilters) 
              : customGroupFilters;
          } catch (e) {
            console.error('[OlahDataController] Failed to parse customGroupFilters:', e);
          }
        }

        const countsManual = {};
        
        // Header nama dari baris header Excel asli
        const rawHeaders = headerRow || [];
        const headerNames = groupCols.map(colIdx => rawHeaders[colIdx] ? rawHeaders[colIdx].toString().trim() : `Kolom ${colIdx + 1}`);

        dataRows.forEach((row) => {
          if (!row || row.length === 0) return;

          // Validasi baris memiliki konten di kolom-kolom pengelompokan terpilih
          const hasContent = groupCols.some(idx => row[idx] !== undefined && row[idx] !== null && row[idx].toString().trim() !== '');
          if (!hasContent) return;

          // Cek kecocokan kriteria filter nilai kolom
          let matchesFilter = true;
          for (let i = 0; i < groupCols.length; i++) {
            const colIdx = groupCols[i];
            const allowedValues = groupFilters[colIdx.toString()];
            if (allowedValues && Array.isArray(allowedValues)) {
              const cellVal = row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx].toString().trim() : '';
              if (!allowedValues.includes(cellVal)) {
                matchesFilter = false;
                break;
              }
            }
          }

          if (!matchesFilter) return;

          const rowData = {};
          const keyParts = [];
          groupCols.forEach((colIdx, index) => {
            const colName = headerNames[index];
            const cellValue = row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx].toString().trim().toUpperCase() : 'TIDAK DIKETAHUI';
            rowData[colName] = cellValue;
            keyParts.push(cellValue);
          });

          const key = keyParts.join('||');
          if (!countsManual[key]) {
            countsManual[key] = {
              data: rowData,
              count: 0
            };
          }
          countsManual[key].count++;
        });

        const aggregatedManual = [];
        Object.keys(countsManual).forEach((key) => {
          const item = countsManual[key];
          aggregatedManual.push({
            ...item.data,
            'Jumlah': item.count
          });
        });

        // Urutkan alfabetis berdasarkan kolom-kolom grouping
        aggregatedManual.sort((a, b) => {
          for (let i = 0; i < headerNames.length; i++) {
            const colName = headerNames[i];
            if (a[colName] !== b[colName]) {
              return a[colName].toString().localeCompare(b[colName].toString());
            }
          }
          return 0;
        });

        const finalManualRows = aggregatedManual.map((item, index) => ({
          No: index + 1,
          ...item
        }));

        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(finalManualRows);

        // Atur lebar kolom
        const colWidths = [{ wch: 6 }]; // No
        headerNames.forEach(() => colWidths.push({ wch: 25 }));
        colWidths.push({ wch: 15 }); // Jumlah
        newSheet['!cols'] = colWidths;

        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Rekap Custom');

        const buffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
        const safeFilename = `Rekapitulasi_Manual_${Date.now()}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        return res.send(buffer);
      }

      // ==========================================
      // MODE 2: REKAPITULASI GEOGRAFIS (STANDARD TEMPLATE)
      // ==========================================
      const provCol = provinsiColIdx !== undefined ? parseInt(provinsiColIdx, 10) : -1;
      const kabCol = kabupatenColIdx !== undefined ? parseInt(kabupatenColIdx, 10) : -1;
      const kCol = kecamatanColIdx !== undefined ? parseInt(kecamatanColIdx, 10) : -1;
      const dCol = desaColIdx !== undefined ? parseInt(desaColIdx, 10) : -1;
      const aCol = alamatColIdx !== undefined ? parseInt(alamatColIdx, 10) : -1;
      const objCol = objekColIdx !== undefined ? parseInt(objekColIdx, 10) : -1;
      
      const filterKab = filterKabupaten ? filterKabupaten.toString().trim().toUpperCase() : '';
      const filterObjVal = objekValue ? objekValue.toString().trim().toUpperCase() : '';

      // Validasi: Minimal salah satu dari Kecamatan, Desa, atau Alamat harus dipetakan
      if (kCol === -1 && dCol === -1 && aCol === -1) {
        return res.status(400).json({
          success: false,
          message: 'Harap petakan minimal salah satu kolom geografis (Kecamatan, Desa/Kelurahan, atau Alamat) pada rekap geografis.'
        });
      }

      const countsDetail = {};

      dataRows.forEach((row) => {
        if (!row || row.length === 0) return;

        // Validasi baris memiliki konten di kolom-kolom yang dipetakan
        const hasContent = [provCol, kabCol, kCol, dCol, aCol]
          .filter(idx => idx !== -1)
          .some(idx => row[idx] !== undefined && row[idx] !== null && row[idx].toString().trim() !== '');

        if (!hasContent) return;

        const provinsiVal = provCol !== -1 ? row[provCol] : 'JAWA BARAT';
        const kabupatenVal = kabCol !== -1 ? row[kabCol] : 'KAB. BOGOR';
        
        let provinsi = (provinsiVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
        let kabupaten = (kabupatenVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();

        // 1. Terapkan filter kabupaten jika diisi
        if (filterKab && !kabupaten.includes(filterKab)) {
          return;
        }

        // 2. Terapkan filter objek utama jika diisi (pencocokan parsial)
        if (objCol !== -1 && filterObjVal) {
          const rowObjVal = row[objCol] ? row[objCol].toString().trim().toUpperCase() : '';
          if (!rowObjVal.includes(filterObjVal)) {
            return; // Lewati baris jika tidak cocok objek utamanya
          }
        }

        const rowData = {};
        rowData['Provinsi'] = provinsi;
        rowData['Kabupaten / Kota'] = kabupaten;

        if (kCol !== -1) {
          rowData['Kecamatan'] = (row[kCol] || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
        }
        if (dCol !== -1) {
          rowData['Desa / Kelurahan'] = (row[dCol] || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
        }

        if (aCol !== -1) {
          let alamat = (row[aCol] || '').toString().trim().toUpperCase();
          let rt = 'TIDAK DIKETAHUI';
          let rw = 'TIDAK DIKETAHUI';

          const rtMatch = alamat.match(/RT\.?\s*(\d+)/i);
          const rwMatch = alamat.match(/RW\.?\s*(\d+)/i);

          if (rtMatch) {
            rt = parseInt(rtMatch[1], 10).toString().padStart(2, '0');
          }
          if (rwMatch) {
            rw = parseInt(rwMatch[1], 10).toString().padStart(2, '0');
          }

          if (rt === 'TIDAK DIKETAHUI' || rw === 'TIDAK DIKETAHUI') {
            const slashMatch = alamat.match(/(?:RT\/RW\s*)?(\d+)\s*\/\s*(\d+)/i);
            if (slashMatch) {
              if (rt === 'TIDAK DIKETAHUI') rt = parseInt(slashMatch[1], 10).toString().padStart(2, '0');
              if (rw === 'TIDAK DIKETAHUI') rw = parseInt(slashMatch[2], 10).toString().padStart(2, '0');
            }
          }
          rowData['RT'] = rt;
          rowData['RW'] = rw;
        }

        // Susun key dinamis berdasarkan kolom aktif
        const keyParts = [];
        keyParts.push(rowData['Provinsi']);
        keyParts.push(rowData['Kabupaten / Kota']);
        if (kCol !== -1) keyParts.push(rowData['Kecamatan']);
        if (dCol !== -1) keyParts.push(rowData['Desa / Kelurahan']);
        if (aCol !== -1) {
          keyParts.push(rowData['RT']);
          keyParts.push(rowData['RW']);
        }
        const keyDetail = keyParts.join('||');

        if (!countsDetail[keyDetail]) {
          countsDetail[keyDetail] = {
            data: rowData,
            count: 0
          };
        }
        countsDetail[keyDetail].count++;
      });

      // --- SHEET 1: REKAP DETAIL ---
      const aggregatedDetail = [];
      Object.keys(countsDetail).forEach((key) => {
        const item = countsDetail[key];
        aggregatedDetail.push({
          ...item.data,
          'Jumlah': item.count
        });
      });

      // Sorting detail dinamis
      aggregatedDetail.sort((a, b) => {
        if (a['Provinsi'] !== b['Provinsi']) return a['Provinsi'].localeCompare(b['Provinsi']);
        if (a['Kabupaten / Kota'] !== b['Kabupaten / Kota']) return a['Kabupaten / Kota'].localeCompare(b['Kabupaten / Kota']);
        if (kCol !== -1 && a['Kecamatan'] !== b['Kecamatan']) return a['Kecamatan'].localeCompare(b['Kecamatan']);
        if (dCol !== -1 && a['Desa / Kelurahan'] !== b['Desa / Kelurahan']) return a['Desa / Kelurahan'].localeCompare(b['Desa / Kelurahan']);
        if (aCol !== -1) {
          if (a['RT'] !== b['RT']) return a['RT'].localeCompare(b['RT']);
          return a['RW'].localeCompare(b['RW']);
        }
        return 0;
      });

      const finalDetailRows = aggregatedDetail.map((item, index) => ({
        No: index + 1,
        ...item
      }));

      // --- COMPILE WORKBOOK ---
      const newWorkbook = xlsx.utils.book_new();
      
      // Dynamic Sheet 1 Name
      const detailSheetName = aCol !== -1 ? 'Rekap per RT RW' : (dCol !== -1 ? 'Rekap per Desa' : 'Rekap Detail');
      const newSheetDetail = xlsx.utils.json_to_sheet(finalDetailRows);

      // Dynamic column widths for Sheet 1
      const detailCols = [
        { wch: 6 },  // No
        { wch: 20 }, // Provinsi
        { wch: 20 }  // Kabupaten / Kota
      ];
      if (kCol !== -1) detailCols.push({ wch: 25 });
      if (dCol !== -1) detailCols.push({ wch: 25 });
      if (aCol !== -1) {
        detailCols.push({ wch: 12 }); // RT
        detailCols.push({ wch: 12 }); // RW
      }
      detailCols.push({ wch: 15 }); // Jumlah
      newSheetDetail['!cols'] = detailCols;

      xlsx.utils.book_append_sheet(newWorkbook, newSheetDetail, detailSheetName);

      // --- SHEET: REKAP PER DESA KELURAHAN (Hanya jika RT/RW dipetakan dan Desa dipetakan) ---
      if (aCol !== -1 && dCol !== -1) {
        const countsDesa = {};
        dataRows.forEach((row) => {
          if (!row || row.length === 0) return;

          const hasContent = [provCol, kabCol, kCol, dCol]
            .filter(idx => idx !== -1)
            .some(idx => row[idx] !== undefined && row[idx] !== null && row[idx].toString().trim() !== '');

          if (!hasContent) return;

          const provinsiVal = provCol !== -1 ? row[provCol] : 'JAWA BARAT';
          const kabupatenVal = kabCol !== -1 ? row[kabCol] : 'KAB. BOGOR';
          const kecamatanVal = kCol !== -1 ? row[kCol] : 'TIDAK DIKETAHUI';
          const desaVal = row[dCol];

          let provinsi = (provinsiVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
          let kabupaten = (kabupatenVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
          let kecamatan = (kecamatanVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
          let desa = (desaVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();

          if (filterKab && !kabupaten.includes(filterKab)) {
            return;
          }

          // Filter objek utama
          if (objCol !== -1 && filterObjVal) {
            const rowObjVal = row[objCol] ? row[objCol].toString().trim().toUpperCase() : '';
            if (!rowObjVal.includes(filterObjVal)) {
              return;
            }
          }

          const keyDesa = `${provinsi}||${kabupaten}||${kecamatan}||${desa}`;
          countsDesa[keyDesa] = (countsDesa[keyDesa] || 0) + 1;
        });

        const aggregatedDesa = [];
        Object.keys(countsDesa).forEach((key) => {
          const [provinsi, kabupaten, kecamatan, desa] = key.split('||');
          const rowData = {
            Provinsi: provinsi,
            'Kabupaten / Kota': kabupaten
          };
          if (kCol !== -1) rowData['Kecamatan'] = kecamatan;
          rowData['Desa / Kelurahan'] = desa;
          rowData['Jumlah'] = countsDesa[key];
          
          aggregatedDesa.push(rowData);
        });

        aggregatedDesa.sort((a, b) => {
          if (a.Provinsi !== b.Provinsi) return a.Provinsi.localeCompare(b.Provinsi);
          if (a['Kabupaten / Kota'] !== b['Kabupaten / Kota']) return a['Kabupaten / Kota'].localeCompare(b['Kabupaten / Kota']);
          if (kCol !== -1 && a.Kecamatan !== b.Kecamatan) return a.Kecamatan.localeCompare(b.Kecamatan);
          return a['Desa / Kelurahan'].localeCompare(b['Desa / Kelurahan']);
        });

        const finalDesaRows = aggregatedDesa.map((item, index) => ({
          No: index + 1,
          ...item
        }));

        const newSheetDesa = xlsx.utils.json_to_sheet(finalDesaRows);
        
        const desaCols = [
          { wch: 6 },  // No
          { wch: 20 }, // Provinsi
          { wch: 25 }  // Kabupaten / Kota
        ];
        if (kCol !== -1) desaCols.push({ wch: 25 }); // Kecamatan
        desaCols.push({ wch: 25 }); // Desa
        desaCols.push({ wch: 15 }); // Jumlah
        newSheetDesa['!cols'] = desaCols;

        xlsx.utils.book_append_sheet(newWorkbook, newSheetDesa, 'Rekap per Desa Kelurahan');
      }

      // --- SHEET 2: REKAP PER KECAMATAN (Hanya jika kolom Kecamatan dipetakan) ---
      if (kCol !== -1) {
        const countsKecamatan = {};
        dataRows.forEach((row) => {
          if (!row || row.length === 0) return;

          const hasContent = [provCol, kabCol, kCol]
            .filter(idx => idx !== -1)
            .some(idx => row[idx] !== undefined && row[idx] !== null && row[idx].toString().trim() !== '');

          if (!hasContent) return;

          const provinsiVal = provCol !== -1 ? row[provCol] : 'JAWA BARAT';
          const kabupatenVal = kabCol !== -1 ? row[kabCol] : 'KAB. BOGOR';
          const kecamatanVal = row[kCol];

          let provinsi = (provinsiVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
          let kabupaten = (kabupatenVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
          let kecamatan = (kecamatanVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();

          if (filterKab && !kabupaten.includes(filterKab)) {
            return;
          }

          // Filter objek utama
          if (objCol !== -1 && filterObjVal) {
            const rowObjVal = row[objCol] ? row[objCol].toString().trim().toUpperCase() : '';
            if (!rowObjVal.includes(filterObjVal)) {
              return;
            }
          }

          const keyKec = `${provinsi}||${kabupaten}||${kecamatan}`;
          countsKecamatan[keyKec] = (countsKecamatan[keyKec] || 0) + 1;
        });

        const aggregatedKec = [];
        Object.keys(countsKecamatan).forEach((key) => {
          const [provinsi, kabupaten, kecamatan] = key.split('||');
          aggregatedKec.push({
            Provinsi: provinsi,
            'Kabupaten / Kota': kabupaten,
            Kecamatan: kecamatan,
            'Jumlah': countsKecamatan[key]
          });
        });

        aggregatedKec.sort((a, b) => {
          if (a.Provinsi !== b.Provinsi) return a.Provinsi.localeCompare(b.Provinsi);
          if (a['Kabupaten / Kota'] !== b['Kabupaten / Kota']) return a['Kabupaten / Kota'].localeCompare(b['Kabupaten / Kota']);
          return a.Kecamatan.localeCompare(b.Kecamatan);
        });

        const finalKecRows = aggregatedKec.map((item, index) => ({
          No: index + 1,
          ...item
        }));

        const newSheetKec = xlsx.utils.json_to_sheet(finalKecRows);
        newSheetKec['!cols'] = [
          { wch: 6 },  // No
          { wch: 20 }, // Provinsi
          { wch: 25 }, // Kabupaten / Kota
          { wch: 25 }, // Kecamatan
          { wch: 15 }  // Jumlah
        ];
        xlsx.utils.book_append_sheet(newWorkbook, newSheetKec, 'Rekap per Kecamatan');
      }

      // --- SHEET 3: REKAP PER KABUPATEN / KOTA (Hanya jika kolom Kabupaten dipetakan) ---
      if (kabCol !== -1) {
        const countsKabupaten = {};
        dataRows.forEach((row) => {
          if (!row || row.length === 0) return;

          const hasContent = [provCol, kabCol]
            .filter(idx => idx !== -1)
            .some(idx => row[idx] !== undefined && row[idx] !== null && row[idx].toString().trim() !== '');

          if (!hasContent) return;

          const provinsiVal = provCol !== -1 ? row[provCol] : 'JAWA BARAT';
          const kabupatenVal = row[kabCol];

          let provinsi = (provinsiVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();
          let kabupaten = (kabupatenVal || 'TIDAK DIKETAHUI').toString().trim().toUpperCase();

          if (filterKab && !kabupaten.includes(filterKab)) {
            return;
          }

          // Filter objek utama
          if (objCol !== -1 && filterObjVal) {
            const rowObjVal = row[objCol] ? row[objCol].toString().trim().toUpperCase() : '';
            if (!rowObjVal.includes(filterObjVal)) {
              return;
            }
          }

          const keyKab = `${provinsi}||${kabupaten}`;
          countsKabupaten[keyKab] = (countsKabupaten[keyKab] || 0) + 1;
        });

        const aggregatedKab = [];
        Object.keys(countsKabupaten).forEach((key) => {
          const [provinsi, kabupaten] = key.split('||');
          aggregatedKab.push({
            Provinsi: provinsi,
            'Kabupaten / Kota': kabupaten,
            'Jumlah': countsKabupaten[key]
          });
        });

        aggregatedKab.sort((a, b) => {
          if (a.Provinsi !== b.Provinsi) return a.Provinsi.localeCompare(b.Provinsi);
          return a['Kabupaten / Kota'].localeCompare(b['Kabupaten / Kota']);
        });

        const finalKabRows = aggregatedKab.map((item, index) => ({
          No: index + 1,
          ...item
        }));

        const newSheetKab = xlsx.utils.json_to_sheet(finalKabRows);
        newSheetKab['!cols'] = [
          { wch: 6 },  // No
          { wch: 20 }, // Provinsi
          { wch: 25 }, // Kabupaten / Kota
          { wch: 15 }  // Jumlah
        ];
        xlsx.utils.book_append_sheet(newWorkbook, newSheetKab, 'Rekap per Kab Kota');
      }

      const buffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

      const filterSuffix = filterKab ? `_${filterKab.replace(/\s+/g, '_')}` : '';
      const safeFilename = `Rekapitulasi_Data${filterSuffix}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      return res.send(buffer);
    } catch (err) {
      console.error('[OlahDataController] processExcel error:', err);
      return res.status(500).json({ success: false, message: 'Gagal memproses file Excel.', error: err.message });
    }
  }

  async compareExcel(req, res) {
    try {
      const {
        tempFileName1,
        sheetName1,
        headerRowIndex1 = 0,
        tempFileName2,
        sheetName2,
        headerRowIndex2 = 0,
        fillDown1 = 'false',
        fillDown2 = 'false',
        label1 = 'RKPD Awal',
        label2 = 'RKPD Baru',
        customGroupFilters,
        customGroupCols
      } = req.body;

      if (!tempFileName1 || !tempFileName2) {
        return res.status(400).json({ success: false, message: 'Harap unggah kedua file terlebih dahulu.' });
      }

      const isFillDown1 = fillDown1 === 'true' || fillDown1 === true;
      const isFillDown2 = fillDown2 === 'true' || fillDown2 === true;

      // Load file 1
      const file1Result = await resolveFileBufferAndRows(tempFileName1, sheetName1, headerRowIndex1, isFillDown1);
      let rows1 = file1Result.dataRows;
      const headers1 = file1Result.headerRow.map(h => String(h || '').toUpperCase().trim());

      // Load file 2
      const file2Result = await resolveFileBufferAndRows(tempFileName2, sheetName2, headerRowIndex2, isFillDown2);
      let rows2 = file2Result.dataRows;
      const headers2 = file2Result.headerRow.map(h => String(h || '').toUpperCase().trim());

      // Apply optional customGroupFilters (e.g. filter by SKPD)
      let groupFilters = {};
      if (customGroupFilters) {
        try {
          groupFilters = typeof customGroupFilters === 'string' 
            ? JSON.parse(customGroupFilters) 
            : customGroupFilters;
        } catch (e) {
          console.error('[OlahDataController] Failed to parse customGroupFilters:', e);
        }
      }

      const activeFilterKeys = Object.keys(groupFilters).filter(k => Array.isArray(groupFilters[k]) && groupFilters[k].length > 0);

      if (activeFilterKeys.length > 0) {
        // Filter rows1
        rows1 = rows1.filter(row => {
          for (const colIdx1Str of activeFilterKeys) {
            const colIdx1 = parseInt(colIdx1Str, 10);
            if (isNaN(colIdx1)) continue;
            const allowedValues = groupFilters[colIdx1Str];
            const cellVal = row[colIdx1] !== undefined && row[colIdx1] !== null ? row[colIdx1].toString().trim().toUpperCase() : '';
            const allowedValuesUpper = allowedValues.map(v => String(v).toUpperCase().trim());
            if (!allowedValuesUpper.includes(cellVal)) {
              return false;
            }
          }
          return true;
        });

        // Filter rows2
        rows2 = rows2.filter(row => {
          for (const colIdx1Str of activeFilterKeys) {
            const colIdx1 = parseInt(colIdx1Str, 10);
            if (isNaN(colIdx1)) continue;
            const allowedValues = groupFilters[colIdx1Str];
            const colName = file1Result.headerRow[colIdx1];
            const colIdx2 = file2Result.headerRow.findIndex(h => 
              String(h || '').toUpperCase().trim() === String(colName || '').toUpperCase().trim()
            );
            const actualColIdx2 = colIdx2 !== -1 ? colIdx2 : colIdx1;
            const cellVal = row[actualColIdx2] !== undefined && row[actualColIdx2] !== null ? row[actualColIdx2].toString().trim().toUpperCase() : '';
            const allowedValuesUpper = allowedValues.map(v => String(v).toUpperCase().trim());
            if (!allowedValuesUpper.includes(cellVal)) {
              return false;
            }
          }
          return true;
        });
        console.log(`[compareExcel] Applied customGroupFilters (case-insensitive). Active columns: ${activeFilterKeys.join(', ')}. File 1: ${rows1.length} rows, File 2: ${rows2.length} rows.`);
      }

      // Define default detailed comparison columns in File 1
      const cols1 = {
        skpdCode: findColIdx(headers1, ['KODE SKPD', 'KODE UNIT', 'KODE ORG']),
        skpdName: findColIdx(headers1, ['NAMA SKPD', 'NAMA UNIT', 'NAMA ORG', 'SKPD']),
        subKegCode: findColIdx(headers1, ['KODE SUB KEGIATAN', 'KODE SUB_KEGIATAN']),
        subKegName: findColIdx(headers1, ['NAMA SUB KEGIATAN', 'NAMA SUB_KEGIATAN', 'SUB KEGIATAN']),
        rekCode: findColIdx(headers1, ['KODE REKENING', 'KODE_REKENING', 'REKENING']),
        rekName: findColIdx(headers1, ['NAMA REKENING', 'NAMA_REKENING']),
        sumberDanaCode: findColIdx(headers1, ['KODE SUMBER DANA', 'KODE SUMBER_DANA', 'KODE DANA']),
        sumberDanaName: findColIdx(headers1, ['NAMA SUMBER DANA', 'NAMA SUMBER_DANA', 'SUMBER DANA']),
        pagu: paguColIdx
      };

      // Map detailed comparison columns to File 2
      const cols2 = {
        skpdCode: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.skpdCode] || '').toUpperCase().trim()),
        skpdName: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.skpdName] || '').toUpperCase().trim()),
        subKegCode: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.subKegCode] || '').toUpperCase().trim()),
        subKegName: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.subKegName] || '').toUpperCase().trim()),
        rekCode: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.rekCode] || '').toUpperCase().trim()),
        rekName: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.rekName] || '').toUpperCase().trim()),
        sumberDanaCode: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.sumberDanaCode] || '').toUpperCase().trim()),
        sumberDanaName: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.sumberDanaName] || '').toUpperCase().trim()),
        pagu: file2Result.headerRow.findIndex(h => String(h || '').toUpperCase().trim() === String(file1Result.headerRow[cols1.pagu] || '').toUpperCase().trim())
      };

      // Fallbacks
      if (cols2.skpdCode === -1) cols2.skpdCode = cols1.skpdCode;
      if (cols2.skpdName === -1) cols2.skpdName = cols1.skpdName;
      if (cols2.subKegCode === -1) cols2.subKegCode = cols1.subKegCode;
      if (cols2.subKegName === -1) cols2.subKegName = cols1.subKegName;
      if (cols2.rekCode === -1) cols2.rekCode = cols1.rekCode;
      if (cols2.rekName === -1) cols2.rekName = cols1.rekName;
      if (cols2.sumberDanaCode === -1) cols2.sumberDanaCode = cols1.sumberDanaCode;
      if (cols2.sumberDanaName === -1) cols2.sumberDanaName = cols1.sumberDanaName;
      if (cols2.pagu === -1) cols2.pagu = cols1.pagu;

      // Extract customGroupCols if provided to customize output columns
      let keyCols = [];
      if (customGroupCols) {
        let parsedCols = [];
        if (typeof customGroupCols === 'string') {
          parsedCols = customGroupCols.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
        } else if (Array.isArray(customGroupCols)) {
          parsedCols = customGroupCols.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
        }
        keyCols = parsedCols.filter(idx => idx !== paguColIdx && idx >= 0 && idx < headers1.length);
      }

      // Default output columns if none selected
      if (keyCols.length === 0) {
        keyCols = [
          cols1.skpdCode,
          cols1.skpdName,
          cols1.subKegCode,
          cols1.subKegName,
          cols1.rekCode,
          cols1.rekName,
          cols1.sumberDanaCode,
          cols1.sumberDanaName
        ].filter(idx => idx !== -1 && idx !== paguColIdx);
      }

      // Map keyCols of File 1 to keyCols2 of File 2 dynamically
      const keyCols2 = keyCols.map(colIdx1 => {
        const colName = file1Result.headerRow[colIdx1];
        const colIdx2 = file2Result.headerRow.findIndex(h => 
          String(h || '').toUpperCase().trim() === String(colName || '').toUpperCase().trim()
        );
        return colIdx2 !== -1 ? colIdx2 : colIdx1;
      });

      // Safe reading helpers
      const getVal = (row, idx) => (idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : '';
      const getNum = (row, idx) => {
        if (idx === -1 || row[idx] === undefined || row[idx] === '') return 0;
        const parsed = parseFloat(String(row[idx]).replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };

      // Case-insensitive key builder for detailed comparison
      const makeKey = (row, cols) => {
        const skpd = getVal(row, cols.skpdCode);
        const subKeg = getVal(row, cols.subKegCode);
        const rek = getVal(row, cols.rekCode);
        const sd = getVal(row, cols.sumberDanaCode);
        return `${skpd}||${subKeg}||${rek}||${sd}`.toUpperCase().trim();
      };

      // Build Map for File 1 (Awal) at detailed level
      const file1Map = new Map();
      for (const row of rows1) {
        const key = makeKey(row, cols1);
        const pagu = getNum(row, cols1.pagu);
        file1Map.set(key, { row, pagu });
      }

      // Build Map for File 2 (Baru) at detailed level
      const file2Map = new Map();
      for (const row of rows2) {
        const key = makeKey(row, cols2);
        const pagu = getNum(row, cols2.pagu);
        file2Map.set(key, { row, pagu });
      }

      // Lists to hold results
      const newItems = [];
      const changedPagu = [];
      const deletedItems = [];

      // Iterate File 2 to find new items and changed items
      for (const [key, val] of file2Map.entries()) {
        const { row, pagu: paguNew } = val;
        const match = file1Map.get(key);
        
        if (!match) {
          const item = {};
          keyCols.forEach((colIdx1, idx) => {
            const colName = file1Result.headerRow[colIdx1] || `Kolom ${colIdx1 + 1}`;
            const colIdx2 = keyCols2[idx];
            item[colName] = row[colIdx2];
          });
          item[`Pagu ${label2}`] = paguNew;
          item['Keterangan'] = 'Item Belanja Baru';
          newItems.push(item);
        } else {
          const paguOld = match.pagu;
          if (paguOld !== paguNew) {
            const item = {};
            keyCols.forEach((colIdx1, idx) => {
              const colName = file1Result.headerRow[colIdx1] || `Kolom ${colIdx1 + 1}`;
              const colIdx2 = keyCols2[idx];
              item[colName] = row[colIdx2];
            });
            item[`Pagu ${label1}`] = paguOld;
            item[`Pagu ${label2}`] = paguNew;
            item['Selisih'] = paguNew - paguOld;
            
            if (paguOld === 0) {
              item['Keterangan'] = 'Mulai Dianggarkan';
            } else if (paguNew === 0) {
              item['Keterangan'] = 'Dinonaktifkan (Pagu 0)';
            } else if (paguNew > paguOld) {
              item['Keterangan'] = 'Pergeseran Pagu Bertambah';
            } else {
              item['Keterangan'] = 'Pergeseran Pagu Berkurang';
            }
            changedPagu.push(item);
          }
        }
      }

      // Iterate File 1 to find deleted items
      for (const [key, val] of file1Map.entries()) {
        const { row, pagu: paguOld } = val;
        const match = file2Map.get(key);
        if (!match) {
          const item = {};
          keyCols.forEach((colIdx1) => {
            const colName = file1Result.headerRow[colIdx1] || `Kolom ${colIdx1 + 1}`;
            item[colName] = row[colIdx1];
          });
          item[`Pagu ${label1}`] = paguOld;
          item['Keterangan'] = 'Item Belanja Dihapus';
          deletedItems.push(item);
        }
      }

      // 3. Build groupSummaryMap for the Ringkasan sheet
      // If SUB UNIT is found in headers, we include it, else we only group by SKPD.
      const subUnitColIdx1 = findColIdx(headers1, ['SUB UNIT', 'NAMA SUB UNIT', 'NAMA SUB_UNIT', 'SUB_UNIT']);
      const subUnitColIdx2 = subUnitColIdx1 !== -1 ? file2Result.headerRow.findIndex(h => 
        String(h || '').toUpperCase().trim() === String(file1Result.headerRow[subUnitColIdx1] || '').toUpperCase().trim()
      ) : -1;

      const groupSummaryMap = new Map();

      // Accumulate totals from File 1 rows
      for (const row of rows1) {
        const skpdCode = getVal(row, cols1.skpdCode);
        const skpdName = getVal(row, cols1.skpdName);
        const subUnitVal = subUnitColIdx1 !== -1 ? getVal(row, subUnitColIdx1) : '';
        const pagu = getNum(row, cols1.pagu);

        const summaryKey = subUnitColIdx1 !== -1 ? `${skpdCode}||${subUnitVal}` : skpdCode;
        if (groupSummaryMap.has(summaryKey)) {
          groupSummaryMap.get(summaryKey).paguOld += pagu;
        } else {
          groupSummaryMap.set(summaryKey, {
            skpdCode,
            skpdName,
            subUnitVal,
            paguOld: pagu,
            paguNew: 0
          });
        }
      }

      // Accumulate totals from File 2 rows
      for (const row of rows2) {
        const skpdCode = getVal(row, cols2.skpdCode);
        const skpdName = getVal(row, cols2.skpdName);
        const actualSubUnitIdx2 = subUnitColIdx2 !== -1 ? subUnitColIdx2 : subUnitColIdx1;
        const subUnitVal = actualSubUnitIdx2 !== -1 ? getVal(row, actualSubUnitIdx2) : '';
        const pagu = getNum(row, cols2.pagu);

        const summaryKey = actualSubUnitIdx2 !== -1 ? `${skpdCode}||${subUnitVal}` : skpdCode;
        if (groupSummaryMap.has(summaryKey)) {
          groupSummaryMap.get(summaryKey).paguNew += pagu;
        } else {
          groupSummaryMap.set(summaryKey, {
            skpdCode,
            skpdName,
            subUnitVal,
            paguOld: 0,
            paguNew: pagu
          });
        }
      }

      const sortByFirstCol = (arr) => {
        if (arr.length === 0) return arr;
        const firstColName = Object.keys(arr[0])[0];
        return arr.sort((a, b) => {
          return String(a[firstColName] || '').localeCompare(String(b[firstColName] || ''));
        });
      };

      sortByFirstCol(newItems);
      sortByFirstCol(changedPagu);
      sortByFirstCol(deletedItems);

      const newWorkbook = xlsx.utils.book_new();

      const formatRupiahColumns = (sheet, isSummary) => {
        if (!sheet || !sheet['!ref']) return;
        const range = xlsx.utils.decode_range(sheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            if (!cell || cell.t !== 'n') continue;
            
            let isPaguCol = false;
            if (isSummary) {
              const moneyStartCol = subUnitColIdx1 !== -1 ? 3 : 2;
              isPaguCol = R >= 14 && C >= moneyStartCol && C <= moneyStartCol + 2;
            } else {
              isPaguCol = keyCols.length <= C && C <= keyCols.length + 3;
            }
            if (isPaguCol) {
              cell.z = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"_);_(@_)';
            }
          }
        }
      };

      const summaryHeader = subUnitColIdx1 !== -1
        ? ['Kode SKPD', 'Nama SKPD', 'Nama Sub Unit', `Pagu ${label1}`, `Pagu ${label2}`, 'Selisih']
        : ['Kode SKPD', 'Nama SKPD', `Pagu ${label1}`, `Pagu ${label2}`, 'Selisih'];

      const ringkasanData = [
        [`RINGKASAN HASIL PERBANDINGAN PERENCANAAN ${label1.toUpperCase()} VS ${label2.toUpperCase()} 2026`, ''],
        ['Keterangan', 'Nilai / Jumlah'],
        [`Total Baris Data ${label1}`, rows1.length],
        [`Total Baris Data ${label2}`, rows2.length],
        ['Jumlah Item Belanja Baru (Item Baru)', newItems.length],
        ['Jumlah Item Belanja Dihapus (Item Dihapus)', deletedItems.length],
        ['Jumlah Item Belanja Bergeser Pagu (Perubahan Pagu)', changedPagu.length],
        ['  - Mulai Dianggarkan (Pagu Lama 0)', changedPagu.filter(x => x['Keterangan'] === 'Mulai Dianggarkan').length],
        ['  - Dinonaktifkan (Pagu Baru 0)', changedPagu.filter(x => x['Keterangan'] === 'Dinonaktifkan (Pagu 0)').length],
        ['  - Pergeseran Pagu Bertambah', changedPagu.filter(x => x['Keterangan'] === 'Pergeseran Pagu Bertambah').length],
        ['  - Pergeseran Pagu Berkurang', changedPagu.filter(x => x['Keterangan'] === 'Pergeseran Pagu Berkurang').length],
        ['', ''],
        ['REKAPITULASI ANGGARAN PER SKPD / SUB UNIT', '', '', ''],
        summaryHeader
      ];

      const sortedGroups = Array.from(groupSummaryMap.values()).sort((a, b) => {
        const skpdCompare = String(a.skpdCode || '').localeCompare(String(b.skpdCode || ''));
        if (skpdCompare !== 0) return skpdCompare;
        return String(a.subUnitVal || '').localeCompare(String(b.subUnitVal || ''));
      });

      let totalPaguOld = 0;
      let totalPaguNew = 0;
      for (const item of sortedGroups) {
        totalPaguOld += item.paguOld;
        totalPaguNew += item.paguNew;
        const rowData = subUnitColIdx1 !== -1
          ? [item.skpdCode, item.skpdName, item.subUnitVal, item.paguOld, item.paguNew, item.paguNew - item.paguOld]
          : [item.skpdCode, item.skpdName, item.paguOld, item.paguNew, item.paguNew - item.paguOld];
        ringkasanData.push(rowData);
      }

      const grandTotalRow = [];
      const paddingCols = subUnitColIdx1 !== -1 ? 2 : 1;
      for (let i = 0; i < paddingCols; ++i) {
        grandTotalRow.push('');
      }
      grandTotalRow.push('TOTAL GRAND TOTAL KABUPATEN BOGOR', totalPaguOld, totalPaguNew, totalPaguNew - totalPaguOld);
      ringkasanData.push(grandTotalRow);

      const newSheetSummary = xlsx.utils.aoa_to_sheet(ringkasanData);
      const summaryColsWidth = subUnitColIdx1 !== -1
        ? [{ wch: 18 }, { wch: 45 }, { wch: 35 }, { wch: 22 }, { wch: 22 }, { wch: 22 }]
        : [{ wch: 18 }, { wch: 45 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
      newSheetSummary['!cols'] = summaryColsWidth;
      xlsx.utils.book_append_sheet(newWorkbook, newSheetSummary, 'Ringkasan');

      const getSheetData = (list, defaultObj) => list.length > 0 ? list : [defaultObj];

      const newSheetNew = xlsx.utils.json_to_sheet(getSheetData(newItems, { 'Pesan': 'Tidak ada data item belanja baru.' }));
      const colsWidthNew = keyCols.map(() => ({ wch: 24 }));
      colsWidthNew.push({ wch: 22 }, { wch: 30 });
      newSheetNew['!cols'] = colsWidthNew;
      xlsx.utils.book_append_sheet(newWorkbook, newSheetNew, 'Item Baru');

      const newSheetChanged = xlsx.utils.json_to_sheet(getSheetData(changedPagu, { 'Pesan': 'Tidak ada data perubahan pagu.' }));
      const colsWidthChanged = keyCols.map(() => ({ wch: 24 }));
      colsWidthChanged.push({ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 30 });
      newSheetChanged['!cols'] = colsWidthChanged;
      xlsx.utils.book_append_sheet(newWorkbook, newSheetChanged, 'Perubahan Pagu');

      const newSheetDeleted = xlsx.utils.json_to_sheet(getSheetData(deletedItems, { 'Pesan': 'Tidak ada data item belanja dihapus.' }));
      const colsWidthDeleted = keyCols.map(() => ({ wch: 24 }));
      colsWidthDeleted.push({ wch: 22 }, { wch: 30 });
      newSheetDeleted['!cols'] = colsWidthDeleted;
      xlsx.utils.book_append_sheet(newWorkbook, newSheetDeleted, 'Item Dihapus');

      formatRupiahColumns(newWorkbook.Sheets['Ringkasan'], true);
      formatRupiahColumns(newWorkbook.Sheets['Item Baru'], false);
      formatRupiahColumns(newWorkbook.Sheets['Perubahan Pagu'], false);
      formatRupiahColumns(newWorkbook.Sheets['Item Dihapus'], false);

      const buffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

      const savePath = path.join('D:/SAMP/Backend/data/Hasil_Perbandingan_RKPD_2026.xlsx');
      await fs.promises.writeFile(savePath, buffer);
      
      const safeFilename = `Perbandingan_RKPD_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      return res.send(buffer);
    } catch (err) {
      console.error('[OlahDataController] compareExcel error:', err);
      return res.status(500).json({ success: false, message: 'Gagal memproses perbandingan.', error: err.message });
    }
  }
}

module.exports = new OlahDataController();
