const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const { PDFParse } = require('pdf-parse');
const pool = require('../../../config/db');
const nayaxaGeminiService = require('../../ai/services/nayaxaGeminiService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../../../uploads/verification');
const templatesDir = path.join(uploadDir, 'templates');
const documentsDir = path.join(uploadDir, 'documents');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });

class DocumentVerificationController {
    
    /**
     * Get list of all verification templates
     */
    async getTemplates(req, res) {
        try {
            const [rows] = await pool.query(
                'SELECT id, tahun, tipe_dokumen, nama_file_template, path_file_template, config_json, created_at FROM master_template_verifikasi ORDER BY tahun DESC, created_at DESC'
            );
            return res.status(200).json({ success: true, data: rows });
        } catch (err) {
            console.error('[VerificationController] getTemplates error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil daftar template.', error: err.message });
        }
    }

    /**
     * Delete a template
     */
    async deleteTemplate(req, res) {
        try {
            const { id } = req.params;
            
            // Get file path first
            const [rows] = await pool.query('SELECT path_file_template FROM master_template_verifikasi WHERE id = ?', [id]);
            if (rows.length > 0) {
                const filePath = path.join(__dirname, '../../../../', rows[0].path_file_template);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // delete physical file
                }
            }

            await pool.query('DELETE FROM master_template_verifikasi WHERE id = ?', [id]);
            return res.status(200).json({ success: true, message: 'Template berhasil dihapus.' });
        } catch (err) {
            console.error('[VerificationController] deleteTemplate error:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus template.', error: err.message });
        }
    }

    /**
     * Inspect uploaded Excel template to detect columns and sheets
     */
    async inspectTemplate(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Tidak ada file template yang diunggah.' });
            }

            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetNames = workbook.SheetNames;
            if (sheetNames.length === 0) {
                return res.status(400).json({ success: false, message: 'Excel tidak memiliki sheet.' });
            }

            const selectedSheet = sheetNames[0];
            const sheet = workbook.Sheets[selectedSheet];
            const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const previewRows = rawRows.slice(0, 50); // first 50 rows for preview

            // Smart detection of columns and header row
            let headerRowIdx = 0;
            let criteriaColIdx = 2; // Column B (1-indexed: 2)
            let adaColIdx = 5;      // Column E (1-indexed: 5) — default for "Ada" checkbox
            let tidakAdaColIdx = 6; // Column F (1-indexed: 6) — default for "Tidak Ada" checkbox
            let notesColIdx = 7;    // Column G (1-indexed: 7) — default for notes/rekomendasi
            // Legacy single-status column (for backward compat)
            let statusColIdx = 5;

            // Scan rows for keywords
            for (let r = 0; r < Math.min(25, rawRows.length); r++) {
                const row = rawRows[r];
                if (!row) continue;
                
                let foundCriteria = false;

                for (let c = 0; c < row.length; c++) {
                    const cellVal = String(row[c] || '').toLowerCase().trim();
                    if (cellVal.includes('kriteria') || cellVal.includes('uraian') || cellVal.includes('indikator')) {
                        criteriaColIdx = c + 1; // 1-indexed
                        foundCriteria = true;
                    }
                    // Detect separate "Ada" column (exact or near-exact match)
                    if (cellVal === 'ada' || cellVal === '√ ada' || cellVal === 'v ada' || cellVal === 'ada (√)') {
                        adaColIdx = c + 1;
                        statusColIdx = c + 1; // also set legacy statusColIdx
                    }
                    // Detect separate "Tidak Ada" column
                    if (cellVal === 'tidak ada' || cellVal === 'tidak ada (x)' || cellVal.includes('tidak ada')) {
                        tidakAdaColIdx = c + 1;
                        notesColIdx = c + 1; // tentatively, override below if notes found
                    }
                    // Detect notes/rekomendasi column
                    if (cellVal.includes('catatan') || cellVal.includes('keterangan') || cellVal.includes('rekomendasi') || cellVal.includes('alasan')) {
                        notesColIdx = c + 1;
                    }
                    // Detect general checklist/status if ada/tidak ada not found
                    if (!cellVal.includes('tidak') && (cellVal.includes('hasil') || cellVal.includes('kesesuaian') || cellVal.includes('checklist') || cellVal === 'status')) {
                        statusColIdx = c + 1;
                    }
                }

                if (foundCriteria) {
                    headerRowIdx = r + 1; // 1-indexed
                    break;
                }
            }

            // Save temporary file in uploads/verification/templates/temp_[timestamp].xlsx
            const tempFileName = `temp_${Date.now()}_${req.file.originalname}`;
            const tempFilePath = path.join(templatesDir, tempFileName);
            fs.writeFileSync(tempFilePath, req.file.buffer);

            return res.status(200).json({
                success: true,
                sheetNames,
                selectedSheet,
                previewRows,
                tempFilePath: `uploads/verification/templates/${tempFileName}`,
                detectedConfig: {
                    headerRowIdx,
                    criteriaColIdx,
                    statusColIdx,
                    adaColIdx,
                    tidakAdaColIdx,
                    notesColIdx
                }
            });
        } catch (err) {
            console.error('[VerificationController] inspectTemplate error:', err);
            return res.status(500).json({ success: false, message: 'Gagal menganalisis file Excel.', error: err.message });
        }
    }

    /**
     * Save verification template officially
     */
    async saveTemplate(req, res) {
        try {
            const { tahun, tipe_dokumen, tempFilePath, sheetName, headerRowIdx, criteriaColIdx, statusColIdx, adaColIdx, tidakAdaColIdx, notesColIdx } = req.body;
            
            if (!tempFilePath || !tahun || !tipe_dokumen) {
                return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
            }

            const tempAbsPath = path.join(__dirname, '../../../../', tempFilePath);
            if (!fs.existsSync(tempAbsPath)) {
                return res.status(400).json({ success: false, message: 'File temporary tidak ditemukan. Silakan unggah kembali.' });
            }

            // Move file to permanent template path
            const fileName = path.basename(tempFilePath).replace('temp_', '');
            const permanentRelPath = `uploads/verification/templates/${fileName}`;
            const permanentAbsPath = path.join(__dirname, '../../../../', permanentRelPath);
            fs.renameSync(tempAbsPath, permanentAbsPath);

            // Parse Excel to extract ALL kriteria rows from the specified Kriteria column (1-indexed)
            const workbook = xlsx.readFile(permanentAbsPath);
            const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
            const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            const critCol = parseInt(criteriaColIdx || 4, 10) - 1; // 0-indexed
            const startRow = parseInt(headerRowIdx || 1, 10);      // 1-indexed

            // Extract ALL rows that have text in the Kriteria column (do not drop legal regulations or specific items)
            const criteriaList = [];
            for (let i = startRow; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row) continue;
                const cellText = String(row[critCol] || '').trim();
                // Skip purely empty cells or header row duplicates
                if (cellText && cellText.length > 1) {
                    criteriaList.push({
                        rowIdx: i + 1, // 1-indexed Excel row number
                        text: cellText
                    });
                }
            }

            console.log(`[SaveTemplate] Extracted ${criteriaList.length} criteria rows from Column ${critCol + 1} starting from Row ${startRow + 1}`);

            // Determine effective adaColIdx and tidakAdaColIdx
            const resolvedAdaCol = parseInt(adaColIdx || statusColIdx || 5, 10);
            const resolvedTidakAdaCol = parseInt(tidakAdaColIdx || 0, 10) || (resolvedAdaCol + 1);
            const resolvedNotesCol = parseInt(notesColIdx || resolvedTidakAdaCol + 1, 10);

            const config = {
                sheetName,
                headerRowIdx: parseInt(headerRowIdx, 10),
                criteriaColIdx: parseInt(criteriaColIdx, 10),
                statusColIdx: resolvedAdaCol,          // statusColIdx = adaColIdx (backward compat)
                adaColIdx: resolvedAdaCol,
                tidakAdaColIdx: resolvedTidakAdaCol,
                notesColIdx: resolvedNotesCol,
                criteriaList
            };

            const [dbResult] = await pool.query(
                'INSERT INTO master_template_verifikasi (tahun, tipe_dokumen, nama_file_template, path_file_template, config_json) VALUES (?, ?, ?, ?, ?)',
                [tahun, tipe_dokumen, fileName, permanentRelPath, JSON.stringify(config)]
            );

            return res.status(200).json({
                success: true,
                message: 'Template verifikasi berhasil disimpan.',
                templateId: dbResult.insertId,
                config
            });

        } catch (err) {
            console.error('[VerificationController] saveTemplate error:', err);
            return res.status(500).json({ success: false, message: 'Gagal menyimpan template.', error: err.message });
        }
    }

    /**
     * Get all verification transactions (history)
     */
    async getVerificationHistory(req, res) {
        try {
            const [rows] = await pool.query(`
                SELECT t.id, t.template_id, t.tahun, t.pd_id, t.nama_dokumen, t.path_file_pdf, t.status, t.hasil_json, t.verifier_id, t.created_at, t.updated_at,
                       i.instansi, i.singkatan as pd_singkatan,
                       p.nama_lengkap as verifier_name
                FROM transaksi_verifikasi_dokumen t
                LEFT JOIN master_instansi_daerah i ON t.pd_id = i.id
                LEFT JOIN users u ON t.verifier_id = u.id
                LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id
                ORDER BY t.created_at DESC
            `);
            return res.status(200).json({ success: true, data: rows });
        } catch (err) {
            console.error('[VerificationController] getHistory error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat verifikasi.', error: err.message });
        }
    }

    /**
     * Run AI-powered automatic verification of PDF against Excel template criteria
     */
    async autoVerifyDocument(req, res) {
        try {
            const { templateId, pdId, tahun, namaDokumen } = req.body;
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Tidak ada file PDF yang diunggah.' });
            }
            if (!templateId || !pdId || !tahun) {
                return res.status(400).json({ success: false, message: 'Informasi template, perangkat daerah, atau tahun tidak lengkap.' });
            }

            // 1. Get template config & physical path
            const [templates] = await pool.query('SELECT config_json, path_file_template FROM master_template_verifikasi WHERE id = ?', [templateId]);
            if (templates.length === 0) {
                return res.status(404).json({ success: false, message: 'Template verifikasi tidak ditemukan.' });
            }

            const { config_json, path_file_template } = templates[0];
            const templateConfig = JSON.parse(config_json);

            // ALWAYS re-read physical Excel file to ensure criteriaList has CORRECT rowIdx values
            // (DB criteriaList may be stale or have rows filtered out previously)
            let criteriaList = [];
            try {
                const templateAbsPath = path.join(__dirname, '../../../../', path_file_template);
                if (fs.existsSync(templateAbsPath)) {
                    const wb = xlsx.readFile(templateAbsPath);
                    const ws = wb.Sheets[templateConfig.sheetName || wb.SheetNames[0]];
                    const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    const critCol = parseInt(templateConfig.criteriaColIdx || 4, 10) - 1;
                    const startRow = parseInt(templateConfig.headerRowIdx || 1, 10);
                    
                    for (let i = startRow; i < rawRows.length; i++) {
                        const r = rawRows[i];
                        if (!r) continue;
                        const text = String(r[critCol] || '').trim();
                        if (text && text.length > 1) {
                            criteriaList.push({ rowIdx: i + 1, text }); // rowIdx is 1-based Excel row number
                        }
                    }
                    console.log(`[AutoVerify] Loaded ${criteriaList.length} criteria rows from Excel (Col ${critCol + 1}, from Row ${startRow + 1}).`);
                }
            } catch (excelErr) {
                console.warn('[AutoVerify] Could not re-read physical template, falling back to DB criteriaList:', excelErr.message);
                criteriaList = templateConfig.criteriaList || [];
            }

            // Final fallback to DB criteria if file read failed
            if (!criteriaList || criteriaList.length === 0) {
                criteriaList = templateConfig.criteriaList || [];
            }

            if (!criteriaList || criteriaList.length === 0) {
                return res.status(400).json({ success: false, message: 'Kriteria verifikasi tidak ditemukan di dalam template ini.' });
            }

            // 2. Save PDF file
            const pdfFileName = `${Date.now()}_${req.file.originalname}`;
            const pdfRelPath = `uploads/verification/documents/${pdfFileName}`;
            const pdfAbsPath = path.join(__dirname, '../../../../', pdfRelPath);
            fs.writeFileSync(pdfAbsPath, req.file.buffer);

            // 3. Extract text from PDF
            let pdfText = '';
            try {
                const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
                await parser.load();
                const parsedResult = await parser.getText();
                pdfText = parsedResult.text || '';
                console.log(`[PDF Parser] Extracted ${pdfText.length} characters of text.`);
            } catch (pdfErr) {
                console.error('[PDF Parser] Error:', pdfErr);
                return res.status(500).json({ success: false, message: 'Gagal mengurai teks dari PDF.', error: pdfErr.message });
            }

            // Cap PDF text size safely at 300,000 chars (~75,000 tokens)
            const textToAnalyze = pdfText ? pdfText.substring(0, 300000) : '';

            // Extract specific sections related to Landasan Hukum / Dasar Hukum to highlight for Gemini
            const legalKeywords = ['landasan hukum', 'dasar hukum', 'peraturan daerah', 'peraturan bupati', 'permendagri', 'undang-undang', 'peraturan menteri', 'perda', 'perbupati'];
            const foundLegalSnippets = [];
            const pdfLines = pdfText.split('\n');
            for (let i = 0; i < pdfLines.length; i++) {
                const lineLower = pdfLines[i].toLowerCase();
                if (legalKeywords.some(kw => lineLower.includes(kw))) {
                    const start = Math.max(0, i - 2);
                    const end = Math.min(pdfLines.length, i + 8);
                    foundLegalSnippets.push(pdfLines.slice(start, end).join('\n'));
                    i += 5; // skip ahead slightly
                    if (foundLegalSnippets.length >= 12) break;
                }
            }
            const legalContextText = foundLegalSnippets.join('\n---\n').substring(0, 25000);

            // 4. Call Gemini to perform verification against criteria
            const apiKey = await nayaxaGeminiService.getApiKey();
            if (!apiKey) {
                return res.status(500).json({ success: false, message: 'Kunci API Gemini tidak diatur. Hubungi administrator.' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `
            Anda adalah Tim Verifikator Perencanaan Daerah (Bappeda) yang sangat teliti. Tugas Anda adalah melakukan evaluasi dan verifikasi dokumen Perubahan Rencana Kerja (P-Renja) Perangkat Daerah Tahun 2026 berdasarkan daftar kriteria verifikasi yang diberikan.
            
            POTONGAN DASAR HUKUM / REGULASI YANG DITERDETEKSI DI PDF:
            =========================================
            ${legalContextText || 'Tidak ada potongan khusus yang terdeteksi, silakan cari di teks dokumen lengkap di bawah.'}
            =========================================

            DOKUMEN P-RENJA TEKS LENGKAP:
            =========================================
            ${textToAnalyze}
            =========================================
            
            PETUNJUK ANALISIS KHUSUS:
            1. **Landasan Hukum / Dasar Hukum**: Periksa POTONGAN DASAR HUKUM di atas maupun seluruh isi dokumen. Jika ditemukan daftar Peraturan (UU, PP, Permendagri, Perda, Perbupati, Perwali, Kepmen) atau bab "Landasan Hukum / Dasar Hukum", WAJIB tentukan status **"Ada"** (✓). Sebutkan nama peraturan yang ditemukan pada kolom notes.
            2. **Tabel 3.1 & Tabel Matriks Program/Subkegiatan**: Pindai Bab III dan Lampiran. Jika ditemukan kode subkegiatan, nama program/kegiatan/subkegiatan, pagu anggaran, atau indikator kinerja, tentukan status **"Ada"** (✓).
            3. **Prinsip Verifikasi**: Jika terdapat bukti peraturan atau tabel di manapun dalam dokumen, WAJIB tentukan status **"Ada"** (✓). Jangan menyatakan "Tidak Ada" kecuali dokumen benar-benar tidak memuat regulasi sama sekali.
            
            Berikut adalah daftar kriteria verifikasi yang harus dinilai.
            KRITERIA VERIFIKASI:
            ${JSON.stringify(criteriaList.map(c => ({ rowIdx: c.rowIdx, text: c.text })))}
            
            Berdasarkan dokumen P-Renja di atas, nilai setiap kriteria tersebut dengan teliti.
            Untuk setiap kriteria, Anda wajib menentukan:
            1. **status**: Tentukan salah satu dari: "Ada" atau "Tidak Ada".
            2. **notes**: 
               - Jika status adalah "Ada", berikan **alasan singkat & bukti penunjang** ditemukannya informasi tersebut (contoh: "Ditemukan pada Bab II: Tercantum UU No. 23/2014 & Permendagri No. 90/2019").
               - Jika status adalah "Tidak Ada", berikan **penjelasan spesifik** kenapa kriteria tersebut tidak ditemukan beserta **rekomendasi perbaikan** yang jelas.
            
            Kembalikan jawaban Anda HANYA berupa JSON array of objects murni tanpa teks pengantar:
            [
              {
                "rowIdx": 5,
                "text": "Kesesuaian nomenklatur...",
                "status": "Ada",
                "notes": "Ditemukan pada Bab II: Didasarkan pada Permendagri No. 90 Tahun 2019."
              },
              {
                "rowIdx": 6,
                "text": "Keterlibatan masyarakat...",
                "status": "Tidak Ada",
                "notes": "Dokumen tidak mencantumkan berita acara hasil Musrenbang RKPD tingkat kecamatan pada Lampiran."
              }
            ]
            `;

            console.log('[AI Verification] Sending request to Gemini API...');
            let verificationResults = [];
            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const responseText = result.response.text();
                // Strip any markdown code fences if returned
                const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                verificationResults = JSON.parse(cleanJson);
                console.log(`[AI Verification] Gemini successfully verified ${verificationResults.length} criteria.`);
            } catch (aiErr) {
                console.error('[AI Verification] Error from Gemini API:', aiErr);
                // Fallback: build default items from criteriaList if AI call failed
                verificationResults = criteriaList.map(c => ({
                    rowIdx: c.rowIdx,
                    text: c.text,
                    status: 'Tidak Ada',
                    notes: 'Gagal dianalisis secara otomatis oleh AI (Koneksi API / Teks terlalu panjang).'
                }));
            }

            // 5. Create a new transaction record in db
            const verifierId = req.user ? req.user.id : null;
            const [dbInsert] = await pool.query(
                'INSERT INTO transaksi_verifikasi_dokumen (template_id, tahun, pd_id, nama_dokumen, path_file_pdf, status, hasil_json, verifier_id) VALUES (?, ?, ?, ?, ?, "Proses", ?, ?)',
                [templateId, tahun, pdId, namaDokumen || 'Dokumen Verifikasi P-Renja', pdfRelPath, JSON.stringify(verificationResults), verifierId]
            );

            return res.status(200).json({
                success: true,
                message: 'Verifikasi dokumen berhasil dijalankan secara otomatis oleh AI.',
                transaksiId: dbInsert.insertId,
                pdfUrl: `/${pdfRelPath}`,
                hasilVerifikasi: verificationResults
            });

        } catch (err) {
            console.error('[VerificationController] autoVerify error:', err);
            return res.status(500).json({ success: false, message: 'Gagal menjalankan verifikasi otomatis.', error: err.message });
        }
    }

    /**
     * Save finalized manual adjustment of verification results
     */
    async saveVerificationResult(req, res) {
        try {
            const { transaksiId, hasilJson, status } = req.body;
            if (!transaksiId || !hasilJson) {
                return res.status(400).json({ success: false, message: 'Data transaksiId dan hasil verifikasi wajib diisi.' });
            }

            await pool.query(
                'UPDATE transaksi_verifikasi_dokumen SET hasil_json = ?, status = ?, verifier_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [JSON.stringify(hasilJson), status || 'Selesai', req.user ? req.user.id : null, transaksiId]
            );

            return res.status(200).json({ success: true, message: 'Hasil verifikasi berhasil disimpan.' });
        } catch (err) {
            console.error('[VerificationController] saveResult error:', err);
            return res.status(500).json({ success: false, message: 'Gagal menyimpan hasil verifikasi.', error: err.message });
        }
    }

    /**
     * Export the verification results back into the original Excel template sheet
     */
    async exportVerificationExcel(req, res) {
        try {
            const { id } = req.params;

            // 1. Get transaction and template path
            const [trans] = await pool.query(`
                SELECT t.hasil_json, t.nama_dokumen, t.template_id, temp.path_file_template, temp.config_json
                FROM transaksi_verifikasi_dokumen t
                JOIN master_template_verifikasi temp ON t.template_id = temp.id
                WHERE t.id = ?
            `, [id]);

            if (trans.length === 0) {
                return res.status(404).json({ success: false, message: 'Data transaksi verifikasi tidak ditemukan.' });
            }

            const { hasil_json, nama_dokumen, path_file_template, config_json } = trans[0];
            const hasilVerif = JSON.parse(hasil_json);
            const config = JSON.parse(config_json);

            const templateAbsPath = path.join(__dirname, '../../../../', path_file_template);
            if (!fs.existsSync(templateAbsPath)) {
                return res.status(404).json({ success: false, message: 'Berkas template fisik tidak ditemukan di server.' });
            }

            // 2. Open workbook with ExcelJS to preserve formats, formulas, and layouts
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(templateAbsPath);
            const worksheet = workbook.getWorksheet(config.sheetName || 1);

            // Read column indices from config or auto-detect from worksheet header row
            let adaCol = parseInt(config.adaColIdx, 10);
            let tidakAdaCol = parseInt(config.tidakAdaColIdx, 10);
            let notesCol = parseInt(config.notesColIdx, 10);

            // Smart auto-detect from worksheet if config is from an older version
            if (!adaCol || !tidakAdaCol || adaCol === 3) {
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber <= 20) {
                        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                            const val = String(cell.value || '').toLowerCase().trim();
                            if (val === 'ada' || val === '√ ada' || val === 'v ada' || val.startsWith('ada (')) {
                                adaCol = colNumber;
                            }
                            if (val === 'tidak ada' || val.startsWith('tidak ada')) {
                                tidakAdaCol = colNumber;
                            }
                            if (val.includes('rekomendasi') || val.includes('catatan') || val.includes('keterangan') || val.includes('alasan')) {
                                if (!notesCol || notesCol === 4) notesCol = colNumber;
                            }
                        });
                    }
                });
            }

            // Fallbacks if still not found
            if (!adaCol || adaCol === 3) adaCol = 5; // Default Column E
            if (!tidakAdaCol) tidakAdaCol = adaCol + 1; // Default Column F
            if (!notesCol || notesCol === 4) notesCol = tidakAdaCol + 1; // Default Column G

            const hasTwoStatusCols = (tidakAdaCol > adaCol);

            console.log(`[ExportExcel] Final column mapping — adaCol: ${adaCol}, tidakAdaCol: ${tidakAdaCol}, notesCol: ${notesCol}, twoCol: ${hasTwoStatusCols}`);

            // 3. Write results to specific cells
            for (const item of hasilVerif) {
                const row = worksheet.getRow(item.rowIdx);
                const statusStr = String(item.status || '').trim();
                
                const isAda = ['Ada', '✓', 'V', 'Sesuai', 'Ada (✓)', 'ADA', 'v', '√'].includes(statusStr);
                const isTidakAda = ['Tidak Ada', 'X', '✗', 'Tidak Sesuai', 'Perlu Perbaikan', 'TIDAK ADA', 'x'].includes(statusStr);

                if (hasTwoStatusCols) {
                    // Two-column mode: write ✓ in Ada column if Ada, write X in Tidak Ada column if Tidak Ada
                    const adaCell = row.getCell(adaCol);
                    const tidakAdaCell = row.getCell(tidakAdaCol);
                    adaCell.value = isAda ? '✓' : '';
                    tidakAdaCell.value = isTidakAda ? 'X' : '';
                    adaCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    tidakAdaCell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else {
                    // Single-column mode: write ✓ or X in statusColIdx column
                    const statusCell = row.getCell(adaCol);
                    statusCell.value = isAda ? '✓' : (isTidakAda ? 'X' : statusStr);
                    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
                }

                // Write notes (Alasan/Bukti penunjang jika Ada, atau Alasan & Rekomendasi jika Tidak Ada)
                const notesCell = row.getCell(notesCol);
                notesCell.value = item.notes || '';
                notesCell.alignment = { wrapText: true, vertical: 'middle' };

                row.commit();
            }

            // 4. Send response stream
            const safeName = String(nama_dokumen).replace(/[^a-zA-Z0-9]/g, '_');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Hasil_Verifikasi_${safeName}.xlsx`);

            await workbook.xlsx.write(res);
            return;

        } catch (err) {
            console.error('[VerificationController] exportExcel error:', err);
            // If headers are already sent, we cannot json res
            if (!res.headersSent) {
                return res.status(500).json({ success: false, message: 'Gagal mengekspor data ke Excel.', error: err.message });
            }
        }
    }

    /**
     * Delete a verification transaction and its associated physical file
     */
    async deleteVerificationTransaction(req, res) {
        try {
            const { id } = req.params;

            // Get file path first to delete the PDF
            const [rows] = await pool.query('SELECT path_file_pdf FROM transaksi_verifikasi_dokumen WHERE id = ?', [id]);
            if (rows.length > 0 && rows[0].path_file_pdf) {
                const filePath = path.join(__dirname, '../../../../', rows[0].path_file_pdf);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // delete physical PDF file
                }
            }

            await pool.query('DELETE FROM transaksi_verifikasi_dokumen WHERE id = ?', [id]);
            return res.status(200).json({ success: true, message: 'Transaksi verifikasi berhasil dihapus.' });
        } catch (err) {
            console.error('[VerificationController] deleteVerificationTransaction error:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus transaksi verifikasi.', error: err.message });
        }
    }

    /**
     * Update the filename of a verification template
     */
    async updateTemplateName(req, res) {
        try {
            const { id } = req.params;
            const { namaFileTemplate } = req.body;
            if (!namaFileTemplate) {
                return res.status(400).json({ success: false, message: 'Nama file template wajib diisi.' });
            }

            await pool.query(
                'UPDATE master_template_verifikasi SET nama_file_template = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [namaFileTemplate, id]
            );
            return res.status(200).json({ success: true, message: 'Nama file template berhasil diperbarui.' });
        } catch (err) {
            console.error('[VerificationController] updateTemplateName error:', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui nama file template.', error: err.message });
        }
    }
}

module.exports = new DocumentVerificationController();
