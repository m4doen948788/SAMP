const xlsx = require('xlsx');
const pool = require('../../../config/db');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Helper untuk menghapus file temporary olah_data_* yang sudah berusia lebih dari 2 jam.
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
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
      }

      // Bersihkan file temp lama
      cleanupOldTempFiles().catch(() => {});

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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
      await fs.promises.writeFile(tempFilePath, req.file.buffer);

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

      // Ambil file buffer dari req.file atau berkas temporary
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

      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const selectedSheetName = sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[selectedSheetName];

      if (!sheet) {
        return res.status(400).json({ success: false, message: `Sheet '${selectedSheetName}' tidak ditemukan.` });
      }

      const hRow = parseInt(headerRowIndex, 10);
      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rawRows.length <= hRow + 1) {
        return res.json({ success: true, values: [] });
      }

      const dataRows = rawRows.slice(hRow + 1);

      // Terapkan perataan hirarki jika diminta
      const isFillDown = fillDown === 'true' || fillDown === true;
      if (isFillDown) {
        applyFillDown(dataRows);
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
        if (cell !== undefined && cell !== null) {
          const val = cell.toString().trim();
          if (val !== '') {
            uniqueVals.add(val);
          }
        }
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
   * Mendukung pembacaan dari file temp untuk efisiensi request.
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

      // Ambil file buffer dari req.file atau berkas temporary
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

      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const selectedSheetName = sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[selectedSheetName];

      if (!sheet) {
        return res.status(400).json({ success: false, message: `Sheet '${selectedSheetName}' tidak ditemukan.` });
      }

      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rawRows.length <= hRow + 1) {
        return res.status(400).json({ success: false, message: 'Data Excel tidak mencukupi untuk diproses.' });
      }

      const dataRows = rawRows.slice(hRow + 1);

      // Terapkan perataan hirarki jika diminta sebelum grouping dilakukan
      const isFillDown = fillDown === 'true' || fillDown === true;
      if (isFillDown) {
        applyFillDown(dataRows);
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
        const rawHeaders = rawRows[hRow] || [];
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
}

module.exports = new OlahDataController();
