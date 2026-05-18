const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = `C:\\Users\\mufli\\Downloads\\DINKES PRA RKA 2026\\RKA USULAN AWAL 2026 YANPRIMER KESTRAD\\RKA USULAN KURJ PARUNG 2026 - EDIT baru.xlsx`;

function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

// 1. Helper to extract metadata with fuzzy/flexible matching
function extractMetadata(rows) {
  const metadata = {
    urusan: '',
    unitOrganisasi: '',
    subUnitOrganisasi: '',
    program: '',
    kegiatan: '',
    subKegiatan: '',
    sumberPendanaan: '',
    lokasiKegiatan: '',
    waktuPelaksanaan: '',
    kelompokSasaran: '',
    jumlah2023: '',
    jumlah2024: '',
    jumlah2025: '',
    jumlah2026: ''
  };

  rows.forEach((row) => {
    let key = String(row[0] || '').trim().toLowerCase().replace(/:$/, '').trim();
    if (!key) return;

    // Look for the first numeric cell or first non-empty cell that is not just a colon or currency symbol
    let val = '';
    let foundNumber = null;
    let firstText = '';

    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      const cellVal = row[colIdx];
      if (cellVal !== null && cellVal !== undefined && cellVal !== '') {
        if (typeof cellVal === 'number') {
          foundNumber = cellVal;
        } else {
          const str = String(cellVal).trim();
          const cleanStr = str.replace(/^:\s*/, '').trim();
          if (cleanStr && cleanStr !== 'Rp.' && cleanStr !== 'Rp') {
            if (!firstText) {
              firstText = cleanStr;
            }
          }
        }
      }
    }

    if (foundNumber !== null) {
      val = String(foundNumber);
    } else {
      val = firstText;
    }

    if (key === 'urusan' || key.includes('urusan pemerintahan')) {
      metadata.urusan = val;
    } else if (key === 'unit organisasi' || key.includes('unit organisasi') || key.includes('organisasi')) {
      if (!key.includes('sub')) {
        metadata.unitOrganisasi = val;
      }
    } else if (key === 'sub unit organisasi' || key.includes('sub unit') || key.includes('sub-unit')) {
      metadata.subUnitOrganisasi = val;
    } else if (key === 'program' || key.startsWith('program')) {
      metadata.program = val;
    } else if (key === 'kegiatan' || key.startsWith('kegiatan')) {
      if (!key.includes('sub') && !key.includes('lokasi')) {
        metadata.kegiatan = val;
      }
    } else if (key === 'sub kegiatan' || key.includes('sub kegiatan') || key.includes('sub-kegiatan')) {
      metadata.subKegiatan = val;
    } else if (key === 'sumber pendanaan' || key.includes('sumber pendanaan') || key.includes('sumber dana')) {
      metadata.sumberPendanaan = val;
    } else if (key === 'lokasi kegiatan' || key.includes('lokasi')) {
      metadata.lokasiKegiatan = val;
    } else if (key === 'waktu pelaksanaan' || key.includes('waktu')) {
      metadata.waktuPelaksanaan = val;
    } else if (key === 'kelompok sasaran' || key.includes('sasaran')) {
      metadata.kelompokSasaran = val;
    } else if (key.includes('jumlah 2023') || (key.includes('jumlah') && key.includes('2023'))) {
      metadata.jumlah2023 = val;
    } else if (key.includes('jumlah 2024') || (key.includes('jumlah') && key.includes('2024'))) {
      metadata.jumlah2024 = val;
    } else if (key.includes('jumlah 2025') || (key.includes('jumlah') && key.includes('2025'))) {
      metadata.jumlah2025 = val;
    } else if (key.includes('jumlah 2026') || (key.includes('jumlah') && key.includes('2026'))) {
      metadata.jumlah2026 = val;
    }
  });

  return metadata;
}

// 2. Helper to dynamically detect the column indexes of the budget table
function detectColumns(rows) {
  let headerRowIndex = -1;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let hasCode = false;
    let hasUraian = false;
    
    for (let j = 0; j < row.length; j++) {
      const cellVal = String(row[j] || '').toLowerCase().trim();
      if (cellVal.includes('kode') || cellVal.includes('rekening')) {
        hasCode = true;
      }
      if (cellVal.includes('uraian')) {
        hasUraian = true;
      }
    }
    
    if (hasCode && hasUraian) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    console.warn('⚠️ Header row not found. Using default column index fallbacks.');
    return {
      startRowIndex: 25,
      codeColIdx: 0,
      uraianColIdx: 1,
      quantityColIdx: 3,
      satuanColIdx: 5,
      hargaSatuanColIdx: 6,
      ppnColIdx: 7,
      totalColIdx: 9
    };
  }
  
  const r1 = rows[headerRowIndex] || [];
  const r2 = rows[headerRowIndex + 1] || [];
  const maxLen = Math.max(r1.length, r2.length);
  
  let codeColIdx = 0;
  let uraianColIdx = 1;
  let quantityColIdx = 3;
  let satuanColIdx = 5;
  let hargaSatuanColIdx = 6;
  let ppnColIdx = 7;
  let totalColIdx = 9;
  
  let foundCode = false;
  let foundUraian = false;
  let foundQty = false;
  let foundSatuan = false;
  let foundHarga = false;
  let foundPpn = false;
  let foundTotal = false;
  
  for (let j = 0; j < maxLen; j++) {
    const val1 = String(r1[j] || '').toLowerCase().trim();
    const val2 = String(r2[j] || '').toLowerCase().trim();
    
    if (!foundCode && (val1.includes('kode') || val1.includes('rekening') || val2.includes('kode') || val2.includes('rekening'))) {
      codeColIdx = j;
      foundCode = true;
    }
    if (!foundUraian && (val1.includes('uraian') || val2.includes('uraian'))) {
      uraianColIdx = j;
      foundUraian = true;
    }
    if (!foundQty && (val1.includes('koefisien') || val1.includes('volume') || val1.includes('kuantitas') || val1.includes('qty') ||
                      val2.includes('koefisien') || val2.includes('volume') || val2.includes('kuantitas') || val2.includes('qty'))) {
      quantityColIdx = j;
      foundQty = true;
    }
    if (!foundSatuan && (val1.includes('satuan') || val2.includes('satuan'))) {
      satuanColIdx = j;
      foundSatuan = true;
    }
    if (!foundHarga && (val1 === 'harga' || val1.includes('harga satuan') || val1.includes('tarif') ||
                        val2 === 'harga' || val2.includes('harga satuan') || val2.includes('tarif'))) {
      hargaSatuanColIdx = j;
      foundHarga = true;
    }
    if (!foundPpn && (val1.includes('ppn') || val2.includes('ppn'))) {
      ppnColIdx = j;
      foundPpn = true;
    }
    
    const isTotal1 = (val1 === 'jumlah' || val1 === 'total' || val1 === 'jumlah total' || val1 === 'jumlah (rp)' || val1 === 'jumlah belanja');
    const isTotal2 = (val2 === 'jumlah' || val2 === 'total' || val2 === 'jumlah total' || val2 === 'jumlah (rp)' || val2 === 'jumlah belanja');
    if (!foundTotal && (isTotal1 || isTotal2)) {
      totalColIdx = j;
      foundTotal = true;
    }
  }
  
  let startRowIndex = headerRowIndex + 1;
  if (headerRowIndex + 1 < rows.length) {
    const nextRow = rows[headerRowIndex + 1];
    let isHeaderPart = false;
    for (let j = 0; j < nextRow.length; j++) {
      const val = String(nextRow[j] || '').toLowerCase().trim();
      if (val === 'koefisien' || val === 'satuan' || val === 'harga' || val === 'ppn') {
        isHeaderPart = true;
        break;
      }
    }
    if (isHeaderPart) {
      startRowIndex = headerRowIndex + 2;
    }
  }
  
  console.log('📊 Column Mapping Detected:');
  console.log(`- Start Row of Data: ${startRowIndex}`);
  console.log(`- Code Col Index: ${codeColIdx}`);
  console.log(`- Uraian Col Index: ${uraianColIdx}`);
  console.log(`- Quantity Col Index: ${quantityColIdx}`);
  console.log(`- Satuan Col Index: ${satuanColIdx}`);
  console.log(`- Harga Satuan Col Index: ${hargaSatuanColIdx}`);
  console.log(`- PPN Col Index: ${ppnColIdx}`);
  console.log(`- Total Col Index: ${totalColIdx}`);
  
  return {
    startRowIndex,
    codeColIdx,
    uraianColIdx,
    quantityColIdx,
    satuanColIdx,
    hargaSatuanColIdx,
    ppnColIdx,
    totalColIdx
  };
}

// 3. Helper to get the correct total amount from a row
function getRowTotal(row, totalColIdx, quantity, hargaSatuan, ppn) {
  const candidates = [totalColIdx, totalColIdx + 1, totalColIdx + 2, totalColIdx - 1];
  for (const idx of candidates) {
    if (idx >= 0 && idx < row.length) {
      const val = row[idx];
      if (typeof val === 'number' && val > 0) {
        return val;
      }
      if (typeof val === 'string' && val.trim() !== '') {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }
  return quantity * hargaSatuan * (1 + (ppn || 0) / 100);
}

// 4. Recursive post-processing to calculate consistent mathematical totals
function calculateTotals(item) {
  let computedTotal = 0;
  
  if (item.items && item.items.length > 0) {
    computedTotal += item.items.reduce((sum, i) => sum + i.jumlah, 0);
  }
  
  if (item.accounts && item.accounts.length > 0) {
    item.accounts.forEach(acc => {
      calculateTotals(acc);
      computedTotal += acc.jumlah;
    });
  }
  
  if (item.subCategories && item.subCategories.length > 0) {
    item.subCategories.forEach(sub => {
      calculateTotals(sub);
      computedTotal += sub.jumlah;
    });
  }
  
  item.jumlah = computedTotal;
}

try {
  console.log('🔄 Loading workbook...');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Sheet1 (2)'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log('🔄 Extracting metadata...');
  const metadata = extractMetadata(rows);
  console.log('Metadata Extracted:', metadata);

  console.log('🔄 Detecting column configuration...');
  const cols = detectColumns(rows);

  const budgetItems = [];
  let currentCategory = null;
  let currentSubCategory = null;
  let currentAccount = null;

  console.log('🔄 Parsing budget rows...');
  for (let i = cols.startRowIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const code = String(row[cols.codeColIdx] || '').trim();
    const uraian = String(row[cols.uraianColIdx] || '').trim();

    if (!code && !uraian) continue;

    if (code) {
      const parts = code.split('.');
      const totalVal = getRowTotal(row, cols.totalColIdx, 0, 0, 0);

      const categoryObj = {
        code,
        uraian,
        jumlah: totalVal || 0,
        subCategories: [],
        accounts: [],
        items: []
      };

      if (parts.length <= 2) {
        currentCategory = categoryObj;
        budgetItems.push(currentCategory);
        currentSubCategory = null;
        currentAccount = null;
      } else if (parts.length === 3 || parts.length === 4) {
        currentSubCategory = categoryObj;
        if (currentCategory) {
          currentCategory.subCategories.push(currentSubCategory);
        } else {
          budgetItems.push(currentSubCategory);
        }
        currentAccount = null;
      } else {
        currentAccount = categoryObj;
        if (currentSubCategory) {
          currentSubCategory.accounts.push(currentAccount);
        } else if (currentCategory) {
          currentCategory.accounts.push(currentAccount);
        } else {
          budgetItems.push(currentAccount);
        }
      }
    } else if (uraian) {
      let quantity = 0;
      if (cols.quantityColIdx !== -1) {
        const qtyVal = row[cols.quantityColIdx];
        if (typeof qtyVal === 'number') quantity = qtyVal;
        else if (qtyVal) quantity = parseFloat(String(qtyVal).replace(/,/g, '')) || 0;
      }

      let satuan = '';
      if (cols.satuanColIdx !== -1) {
        satuan = String(row[cols.satuanColIdx] || '').trim();
      }

      let hargaSatuan = 0;
      if (cols.hargaSatuanColIdx !== -1) {
        const hsVal = row[cols.hargaSatuanColIdx];
        if (typeof hsVal === 'number') hargaSatuan = hsVal;
        else if (hsVal) hargaSatuan = parseFloat(String(hsVal).replace(/,/g, '')) || 0;
      }

      let ppn = 0;
      if (cols.ppnColIdx !== -1) {
        const ppnVal = row[cols.ppnColIdx];
        if (typeof ppnVal === 'number') ppn = ppnVal;
        else if (ppnVal) ppn = parseFloat(String(ppnVal).replace(/,/g, '')) || 0;
      }

      const jumlahItem = getRowTotal(row, cols.totalColIdx, quantity, hargaSatuan, ppn);

      if (quantity > 0 && hargaSatuan > 0) {
        const itemDetail = {
          uraian,
          quantity,
          satuan,
          hargaSatuan,
          ppn,
          jumlah: jumlahItem
        };

        if (currentAccount) {
          currentAccount.items.push(itemDetail);
        } else if (currentSubCategory) {
          currentSubCategory.items.push(itemDetail);
        } else if (currentCategory) {
          currentCategory.items.push(itemDetail);
        }
      }
    }
  }

  console.log('🔄 Calculating mathematically consistent totals...');
  budgetItems.forEach(cat => {
    calculateTotals(cat);
  });

  const outputJsonPath = path.join('d:', 'copy-dashboard', 'Backend', 'rka_parsed.json');
  fs.writeFileSync(outputJsonPath, JSON.stringify({ metadata, budgetItems }, null, 2));
  console.log(`✅ Successfully wrote parsed JSON to ${outputJsonPath}`);

  // Create report
  let markdown = `# Rencana Kerja dan Anggaran (RKA) Usulan KURJ Parung 2026\n\n`;
  markdown += `## 📋 Informasi Umum\n\n`;
  markdown += `| Bidang | Keterangan |\n`;
  markdown += `| :--- | :--- |\n`;
  markdown += `| **Urusan** | ${metadata.urusan} |\n`;
  markdown += `| **Unit Organisasi** | ${metadata.unitOrganisasi} |\n`;
  markdown += `| **Sub Unit Organisasi** | ${metadata.subUnitOrganisasi} |\n`;
  markdown += `| **Program** | ${metadata.program} |\n`;
  markdown += `| **Kegiatan** | ${metadata.kegiatan} |\n`;
  markdown += `| **Sub Kegiatan** | ${metadata.subKegiatan} |\n`;
  markdown += `| **Sumber Pendanaan** | ${metadata.sumberPendanaan} |\n`;
  markdown += `| **Lokasi Kegiatan** | ${metadata.lokasiKegiatan} |\n`;
  markdown += `| **Waktu Pelaksanaan** | ${metadata.waktuPelaksanaan} |\n`;
  markdown += `| **Kelompok Sasaran** | ${metadata.kelompokSasaran} |\n\n`;

  markdown += `## 💰 Perbandingan Pagu Anggaran Tahunan\n\n`;
  markdown += `* **Tahun 2023:** ${formatRupiah(parseFloat(metadata.jumlah2023)) || metadata.jumlah2023}\n`;
  markdown += `* **Tahun 2024:** ${formatRupiah(parseFloat(metadata.jumlah2024)) || metadata.jumlah2024}\n`;
  markdown += `* **Tahun 2025:** ${formatRupiah(parseFloat(metadata.jumlah2025)) || metadata.jumlah2025}\n`;
  markdown += `* **Tahun 2026 (Usulan):** ${formatRupiah(parseFloat(metadata.jumlah2026)) || metadata.jumlah2026}\n\n`;

  markdown += `## 🔍 Rincian Belanja Sub Kegiatan (Tahun 2026)\n\n`;

  function buildMarkdownTree(item, depth = 0) {
    let output = '';
    
    if (depth === 0) {
      output += `### 📁 Kode ${item.code} - ${item.uraian} (${formatRupiah(item.jumlah)})\n\n`;
    } else if (depth === 1) {
      output += `#### 📂 Kode ${item.code} - ${item.uraian} (${formatRupiah(item.jumlah)})\n\n`;
    } else {
      output += `##### 📄 Kode ${item.code} - ${item.uraian} (${formatRupiah(item.jumlah)})\n\n`;
    }

    if (item.items && item.items.length > 0) {
      output += `| No | Uraian Rincian / Spesifikasi | Koefisien | Satuan | Harga Satuan | PPN | Jumlah Total |\n`;
      output += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;
      item.items.forEach((sub, idx) => {
        output += `| ${idx + 1} | ${sub.uraian.replace(/\n/g, ' ')} | ${sub.quantity} | ${sub.satuan} | ${formatRupiah(sub.hargaSatuan)} | ${sub.ppn}% | **${formatRupiah(sub.jumlah)}** |\n`;
      });
      output += `\n`;
    }

    if (item.subCategories && item.subCategories.length > 0) {
      item.subCategories.forEach(sub => {
        output += buildMarkdownTree(sub, depth + 1);
      });
    }

    if (item.accounts && item.accounts.length > 0) {
      item.accounts.forEach(acc => {
        output += buildMarkdownTree(acc, depth + 1);
      });
    }

    return output;
  }

  budgetItems.forEach(cat => {
    markdown += buildMarkdownTree(cat, 0);
  });

  const outputMdPath = path.join('d:', 'copy-dashboard', 'Backend', 'rka_parsed_report.md');
  fs.writeFileSync(outputMdPath, markdown);
  console.log(`✅ Successfully wrote parsed Markdown report to ${outputMdPath}`);

} catch (err) {
  console.error('❌ Error during parse:', err);
}
