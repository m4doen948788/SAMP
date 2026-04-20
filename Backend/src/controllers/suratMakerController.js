const pool = require('../config/db');
const HTMLtoDOCX = require('html-to-docx');
const path = require('path');
const fs = require('fs');

const suratMakerController = {
    generateDocx: async (req, res) => {
        try {
            const { 
                nomor_surat, perihal, lampiran, sifat, tanggal_surat, 
                tujuan_surat, isi_surat, tembusan,
                nama_penanda, jabatan_penanda, nip_penanda
            } = req.body;
            
            const instansi_id = req.user.instansi_id;

            // 1. Get Instance Profile for KOP
            const [instRows] = await pool.query(
                `SELECT instansi, nama_instansi_kop, alamat, kode_pos, telepon_kop, faks_kop, email_kop, website_kop, logo_kop_path 
                 FROM master_instansi_daerah WHERE id = ?`, 
                [instansi_id]
            );

            if (instRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Profil instansi tidak ditemukan.' });
            }

            const inst = instRows[0];
            const cleanLogoPath = inst.logo_kop_path ? (inst.logo_kop_path.startsWith('/') ? inst.logo_kop_path.substring(1) : inst.logo_kop_path) : null;
            const logoPath = cleanLogoPath ? path.join(__dirname, '../../', cleanLogoPath) : null;
            let logoBase64 = '';
            
            if (logoPath && fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/${path.extname(logoPath).replace('.', '')};base64,${logoBuffer.toString('base64')}`;
            }

            // 2. Construct KOP HTML
            const headerHTML = `
                <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 15%; text-align: left;">
                                ${logoBase64 ? `<img src="${logoBase64}" width="80" height="90" />` : ''}
                            </td>
                            <td style="width: 85%; text-align: center;">
                                <div style="font-family: 'Times New Roman'; font-size: 16pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">
                                    PEMERINTAH KABUPATEN BOGOR
                                </div>
                                <div style="font-family: 'Times New Roman'; font-size: 18pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">
                                    ${inst.nama_instansi_kop || inst.instansi}
                                </div>
                                <div style="font-family: 'Times New Roman'; font-size: 10pt; line-height: 1.3;">
                                    ${inst.alamat || ''} ${inst.kode_pos ? 'Kode Pos ' + inst.kode_pos : ''}<br/>
                                    ${inst.telepon_kop ? 'Telepon: ' + inst.telepon_kop : ''} ${inst.faks_kop ? 'Faksimile: ' + inst.faks_kop : ''}<br/>
                                    Laman: ${inst.website_kop || ''}, Pos-el: ${inst.email_kop || ''}
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            // 3. Construct Body HTML
            const dateObj = new Date(tanggal_surat || new Date());
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            
            // Note: Cibinong is hardcoded based on sample, ideally comes from instansi_wilayah
            const locationDate = `<div style="text-align: right; font-family: 'Times New Roman'; font-size: 11pt; margin-bottom: 20px;">Cibinong, ${dateStr}</div>`;

            const metaTable = `
                <table style="width: 100%; font-family: 'Times New Roman'; font-size: 11pt; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 15%;">Nomor</td>
                        <td style="width: 2%;">:</td>
                        <td style="width: 48%;">${nomor_surat || '...'}</td>
                        <td style="width: 35%;">Kepada</td>
                    </tr>
                    <tr>
                        <td>Sifat</td>
                        <td>:</td>
                        <td>${sifat || 'Penting'}</td>
                        <td rowspan="3" style="vertical-align: top;">
                            Yth. ${tujuan_surat || 'Daftar Terlampir'}<br/>
                            di<br/>
                            &nbsp;&nbsp;&nbsp;&nbsp;tempat
                        </td>
                    </tr>
                    <tr>
                        <td>Lampiran</td>
                        <td>:</td>
                        <td>${lampiran || '-'}</td>
                    </tr>
                    <tr>
                        <td>Hal</td>
                        <td>:</td>
                        <td><strong>${perihal || 'Undangan'}</strong></td>
                    </tr>
                </table>
            `;

            const fullContent = `
                ${locationDate}
                ${metaTable}
                <div style="font-family: 'Times New Roman'; font-size: 11pt; line-height: 1.5; text-align: justify;">
                    ${isi_surat || '<p>Silahkan isi surat anda...</p>'}
                </div>
                <br/><br/>
                <div style="width: 100%; font-family: 'Times New Roman'; font-size: 11pt;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 50%;"></td>
                            <td style="width: 50%; text-align: center;">
                                <div style="display: inline-block; text-align: left;">
                                    ${jabatan_penanda || 'KEPALA,'}<br/><br/><br/><br/>
                                    <strong>${nama_penanda || 'NAMA PEJABAT'}</strong><br/>
                                    ${nip_penanda ? 'NIP. ' + nip_penanda : ''}
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            // 4. Convert to DOCX
            const fileBuffer = await HTMLtoDOCX(fullContent, headerHTML, {
                footer: true,
                pageNumber: true,
            });

            // 5. Save to disk and table
            const fileName = `Surat_Maker_${Date.now()}.docx`;
            const relativePath = `/uploads/${fileName}`;
            const absolutePath = path.resolve(__dirname, '../../uploads/', fileName);

            if (!fs.existsSync(path.resolve(__dirname, '../../uploads/'))) {
                fs.mkdirSync(path.resolve(__dirname, '../../uploads/'), { recursive: true });
            }

            fs.writeFileSync(absolutePath, fileBuffer);

            // Record in database (as a document upload)
            const [docResult] = await pool.query(
                `INSERT INTO dokumen_upload (nama_file, path, ukuran, jenis_dokumen_id, uploaded_by) 
                 VALUES (?, ?, ?, ?, ?)`,
                [`${(perihal || 'Surat').replace(/\s+/g, '_')}.docx`, relativePath, fileBuffer.length, 1, req.user.id]
            );

            res.json({ 
                success: true, 
                message: 'Surat berhasil digaungkan.',
                data: {
                    id: docResult.insertId,
                    path: relativePath,
                    fileName: fileName
                }
            });

        } catch (err) {
            console.error('Error generating docx:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getKlasifikasi: async (req, res) => {
        try {
            const { search } = req.query;
            let query = 'SELECT kode, nama FROM master_klasifikasi_arsip';
            let params = [];

            if (search) {
                query += ' WHERE kode LIKE ? OR nama LIKE ?';
                params = [`%${search}%`, `%${search}%`];
            }

            query += ' ORDER BY kode ASC LIMIT 500';

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching klasifikasi:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getNextNumber: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            const tahun = new Date().getFullYear();

            // Get the max last_number across ALL fields in this instance
            const [rows] = await pool.query(
                'SELECT MAX(last_number) as max_num FROM surat_counters WHERE instansi_id = ? AND tahun = ?',
                [instansi_id, tahun]
            );

            const nextNumber = (rows[0]?.max_num || 0) + 1;
            res.json({ success: true, data: { nextNumber } });
        } catch (error) {
            console.error('Error getting next number:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    takeNumber: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            let { 
                bidang_id, kode_klasifikasi, perihal, tanggal_surat, tujuan, jenis_surat, bidang_singkatan
            } = req.body;
            
            const instansi_id = req.user.instansi_id;
            const created_by = req.user.id;
            
            // Robust Date Handling using Indonesia/Jakarta time
            const dateObj = tanggal_surat ? new Date(tanggal_surat) : new Date();
            const targetDate = dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
            const tahun = dateObj.getFullYear();

            // Fetch missing bidang abbreviation if needed
            if (!bidang_singkatan && bidang_id) {
                const [bidangRows] = await connection.query(
                    'SELECT singkatan FROM master_bidang_instansi WHERE id = ?',
                    [bidang_id]
                );
                bidang_singkatan = bidangRows[0]?.singkatan || 'UNK';
            }

            // 1. Get Settings
            const [settingsRows] = await connection.query(
                'SELECT slot_size, buffer_size FROM surat_numbering_settings WHERE instansi_id = ? LIMIT 1',
                [instansi_id]
            );
            const slotSize = settingsRows[0]?.slot_size || 15;
            const bufferSize = settingsRows[0]?.buffer_size || 5;

            // 2. Check/Produce Daily Slot
            let [slotRows] = await connection.query(
                'SELECT * FROM surat_daily_slots WHERE tanggal = ? AND instansi_id = ? FOR UPDATE',
                [targetDate, instansi_id]
            );

            let currentSlot;
            if (slotRows.length === 0) {
                // Find latest slot before this date
                const [prevSlotRows] = await connection.query(
                    'SELECT end_number FROM surat_daily_slots WHERE instansi_id = ? AND tanggal < ? ORDER BY tanggal DESC LIMIT 1',
                    [instansi_id, targetDate]
                );

                // Find max used number in log anyway to be safe
                const [maxLogRows] = await connection.query(
                    'SELECT MAX(nomor_urut) as max_num FROM surat_nomor_log WHERE instansi_id = ?',
                    [instansi_id]
                );

                const lastGlobalEnd = Math.max(prevSlotRows[0]?.end_number || 0, maxLogRows[0]?.max_num || 0);
                const start = lastGlobalEnd + bufferSize + 1;
                const end = start + slotSize - 1;

                await connection.query(
                    'INSERT INTO surat_daily_slots (instansi_id, tanggal, start_number, end_number) VALUES (?, ?, ?, ?)',
                    [instansi_id, targetDate, start, end]
                );
                
                currentSlot = { start_number: start, end_number: end };
            } else {
                currentSlot = slotRows[0];
            }

            // 3. Find Available Number in Slot
            const [usedNumbersRows] = await connection.query(
                'SELECT nomor_urut FROM surat_nomor_log WHERE instansi_id = ? AND tanggal_surat = ? AND nomor_suffix IS NULL ORDER BY nomor_urut ASC',
                [instansi_id, targetDate]
            );
            const usedNumbers = usedNumbersRows.map(r => r.nomor_urut);

            let assignedNumber = null;
            let assignedSuffix = null;

            // Search for gaps
            for (let i = currentSlot.start_number; i <= currentSlot.end_number; i++) {
                if (!usedNumbers.includes(i)) {
                    assignedNumber = i;
                    break;
                }
            }

            // 4. Handle Overflow (Suffixes)
            if (assignedNumber === null) {
                assignedNumber = currentSlot.end_number;
                const [suffixRows] = await connection.query(
                    'SELECT nomor_suffix FROM surat_nomor_log WHERE instansi_id = ? AND tanggal_surat = ? AND nomor_urut = ? AND nomor_suffix IS NOT NULL ORDER BY nomor_suffix DESC LIMIT 1',
                    [instansi_id, targetDate, assignedNumber]
                );

                if (suffixRows.length === 0) {
                    assignedSuffix = 'a';
                } else {
                    const lastSuffix = suffixRows[0].nomor_suffix;
                    const nextCharCode = lastSuffix.charCodeAt(0) + 1;
                    assignedSuffix = String.fromCharCode(nextCharCode);
                }
            }

            const formattedNum = assignedNumber.toString().padStart(3, '0');
            const suffixStr = assignedSuffix ? assignedSuffix : '';
            const nomor_surat_full = `${kode_klasifikasi}/${formattedNum}${suffixStr}-${bidang_singkatan}`;

            // 5. Insert into log (CRITICAL: Do this BEFORE updating counters to ensure atomic failure)
            const [logResult] = await connection.query(
                `INSERT INTO surat_nomor_log 
                (instansi_id, bidang_id, kode_klasifikasi, nomor_urut, nomor_suffix, nomor_surat_full, perihal, tanggal_surat, tujuan, jenis_surat, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [instansi_id, bidang_id, kode_klasifikasi, assignedNumber, assignedSuffix, nomor_surat_full, perihal, targetDate, tujuan, jenis_surat, created_by]
            );

            // 6. Update global counter
            const maxUsed = Math.max(assignedNumber, currentSlot.end_number);
            await connection.query(
                `INSERT INTO surat_counters (instansi_id, bidang_id, tahun, last_number) 
                 VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_number = ?`,
                [instansi_id, bidang_id, tahun, maxUsed, maxUsed]
            );

            await connection.commit();
            res.json({ 
                success: true, 
                message: 'Nomor berhasil diterbitkan', 
                data: { 
                    id: logResult.insertId,
                    nomor_surat_full,
                    nomor_urut: assignedNumber,
                    nomor_suffix: assignedSuffix
                } 
            });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('CRITICAL ERROR in takeNumber:', error);
            res.status(500).json({ success: false, message: `Gagal menerbitkan nomor: ${error.message}` });
        } finally {
            if (connection) connection.release();
        }
    },

    getNumberLogs: async (req, res) => {
        try {
            const { month, year, instansi_id: queryInstansiId } = req.query;
            const isSuperAdmin = req.user.tipe_user_id == 1;
            let instansi_id = req.user.instansi_id;
            const userId = req.user.id;
            const userType = req.user.tipe_user_id;

            if (isSuperAdmin && queryInstansiId && queryInstansiId !== 'all') {
                instansi_id = queryInstansiId;
            }

            let query = `
                SELECT l.*, b.singkatan as bidang_singkatan, u.username as creator_name, k.nama as klasifikasi_nama
                FROM surat_nomor_log l
                LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id
                LEFT JOIN users u ON l.created_by = u.id
                LEFT JOIN master_klasifikasi_arsip k ON l.kode_klasifikasi = k.kode COLLATE utf8mb4_unicode_ci
                WHERE MONTH(l.tanggal_surat) = ? AND YEAR(l.tanggal_surat) = ?
            `;
            const params = [month, year];

            // If not superadmin or if specific instansi requested
            if (!isSuperAdmin || (queryInstansiId && queryInstansiId !== 'all')) {
                query += ' AND l.instansi_id = ?';
                params.push(instansi_id);
            }

            query += ' ORDER BY l.nomor_urut DESC, l.nomor_suffix DESC';

            const [rows] = await pool.query(query, params);

            // Add permission flag for each row
            const data = rows.map(row => ({
                ...row,
                can_edit: userType == 1 || userType == 2 || row.created_by === userId
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching number logs:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    updateNumberLog: async (req, res) => {
        try {
            const { id } = req.params;
            const { perihal, tujuan, jenis_surat, status } = req.body;
            const userId = req.user.id;
            const userType = req.user.tipe_user_id;

            // Check permission
            const [checkRows] = await pool.query('SELECT created_by FROM surat_nomor_log WHERE id = ?', [id]);
            if (checkRows.length === 0) return res.status(404).json({ success: false, message: 'Log not found' });
            
            if (userType !== 1 && userType !== 2 && checkRows[0].created_by !== userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            await pool.query(
                'UPDATE surat_nomor_log SET perihal = ?, tujuan = ?, jenis_surat = ?, status = ? WHERE id = ?',
                [perihal, tujuan, jenis_surat, status, id]
            );

            res.json({ success: true, message: 'Log updated successfully' });
        } catch (error) {
            console.error('Error updating log:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = suratMakerController;
