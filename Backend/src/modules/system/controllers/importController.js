const pool = require('../../../config/db');
const XLSX = require('xlsx');

const importController = {
    importPerencanaan: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            console.log('--- Import Debug ---');
            console.log('Total raw rows:', rawRows.length);

            // Find header row index
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
                const row = rawRows[i];
                if (row.some(cell => String(cell || '').toUpperCase().includes('NOMENKLATUR'))) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                return res.status(400).json({ success: false, message: 'Format Excel tidak dikenali. Kolom "NOMENKLATUR" tidak ditemukan.' });
            }

            const headers = rawRows[headerRowIndex].map(h => String(h || '').toUpperCase());
            const dataRows = rawRows.slice(headerRowIndex + 1);

            const findCol = (searchTerm) => headers.findIndex(h => h.includes(searchTerm.toUpperCase()));
            
            const colIndices = {
                bidang: findCol('BIDANG URUSAN'),
                program: findCol('PROGRAM'),
                kegiatan: findCol('KEGIATAN'),
                sub: findCol('SUB KEGIATAN'),
                nama: findCol('NOMENKLATUR'),
                kinerja: findCol('KINERJA'),
                indikator: findCol('INDIKATOR'),
                satuan: findCol('SATUAN')
            };

            console.log('Column mapping:', colIndices);

            let lastBidangUrusanId = null;
            let lastProgramId = null;
            let lastKegiatanId = null;
            let stats = { bidang: 0, program: 0, kegiatan: 0, subKegiatan: 0, skipped: 0 };

            await connection.beginTransaction();

            for (const row of dataRows) {
                const getValue = (idx) => (idx !== -1 && row[idx]) ? String(row[idx]).trim() : '';
                
                const cb = getValue(colIndices.bidang);
                const cp = getValue(colIndices.program);
                const ck = getValue(colIndices.kegiatan);
                const cs = getValue(colIndices.sub);
                const nama = getValue(colIndices.nama);
                const kinerja = getValue(colIndices.kinerja);
                const indi = getValue(colIndices.indikator);
                const sat = getValue(colIndices.satuan);

                if (!nama) continue;

                if (cs) {
                    if (!lastKegiatanId) { stats.skipped++; continue; }
                    const [exists] = await connection.query('SELECT id FROM master_sub_kegiatan WHERE kode_sub_kegiatan = ? AND kegiatan_id = ?', [cs, lastKegiatanId]);
                    if (exists.length > 0) {
                        await connection.query('UPDATE master_sub_kegiatan SET nama_sub_kegiatan = ?, kinerja = ?, indikator = ?, satuan = ? WHERE id = ?', [nama, kinerja, indi, sat, exists[0].id]);
                    } else {
                        await connection.query('INSERT INTO master_sub_kegiatan (kegiatan_id, kode_sub_kegiatan, nama_sub_kegiatan, kinerja, indikator, satuan) VALUES (?, ?, ?, ?, ?, ?)', [lastKegiatanId, cs, nama, kinerja, indi, sat]);
                    }
                    stats.subKegiatan++;
                }
                else if (ck) {
                    if (!lastProgramId) { stats.skipped++; continue; }
                    const [exists] = await connection.query('SELECT id FROM master_kegiatan WHERE kode_kegiatan = ? AND program_id = ?', [ck, lastProgramId]);
                    if (exists.length > 0) {
                        lastKegiatanId = exists[0].id;
                        await connection.query('UPDATE master_kegiatan SET nama_kegiatan = ? WHERE id = ?', [nama, lastKegiatanId]);
                    } else {
                        const [result] = await connection.query('INSERT INTO master_kegiatan (program_id, kode_kegiatan, nama_kegiatan) VALUES (?, ?, ?)', [lastProgramId, ck, nama]);
                        lastKegiatanId = result.insertId;
                    }
                    stats.kegiatan++;
                }
                else if (cp) {
                    if (!lastBidangUrusanId) { stats.skipped++; continue; }
                    const [exists] = await connection.query('SELECT id FROM master_program WHERE kode_program = ? AND urusan_id = ?', [cp, lastBidangUrusanId]);
                    if (exists.length > 0) {
                        lastProgramId = exists[0].id;
                        await connection.query('UPDATE master_program SET nama_program = ? WHERE id = ?', [nama, lastProgramId]);
                    } else {
                        const [result] = await connection.query('INSERT INTO master_program (urusan_id, kode_program, nama_program) VALUES (?, ?, ?)', [lastBidangUrusanId, cp, nama]);
                        lastProgramId = result.insertId;
                    }
                    lastKegiatanId = null;
                    stats.program++;
                }
                else if (cb) {
                    const uCode = cb.split('.')[0];
                    let uId;
                    const [uExists] = await connection.query('SELECT id FROM master_bidang_urusan WHERE kode_urusan = ? AND parent_id IS NULL', [uCode]);
                    if (uExists.length > 0) uId = uExists[0].id;
                    else {
                        const [res] = await connection.query('INSERT INTO master_bidang_urusan (kode_urusan, urusan, parent_id) VALUES (?, ?, NULL)', [uCode, 'Urusan ' + uCode]);
                        uId = res.insertId;
                    }

                    const [exists] = await connection.query('SELECT id FROM master_bidang_urusan WHERE kode_urusan = ? AND parent_id = ?', [cb, uId]);
                    if (exists.length > 0) {
                        lastBidangUrusanId = exists[0].id;
                        await connection.query('UPDATE master_bidang_urusan SET urusan = ? WHERE id = ?', [nama, lastBidangUrusanId]);
                    } else {
                        const [res] = await connection.query('INSERT INTO master_bidang_urusan (kode_urusan, urusan, parent_id) VALUES (?, ?, ?)', [cb, nama, uId]);
                        lastBidangUrusanId = res.insertId;
                    }
                    lastProgramId = null;
                    lastKegiatanId = null;
                    stats.bidang++;
                }
            }
            await connection.commit();
            console.log('--- Import Stats ---', stats);
            res.json({ success: true, message: `Import berhasil: ${stats.bidang} Bidang, ${stats.program} Program, ${stats.kegiatan} Kegiatan, ${stats.subKegiatan} Sub-Kegiatan.`, stats });
        } catch (error) {
            await connection.rollback();
            console.error('Error importing data:', error);
            res.status(500).json({ success: false, message: 'Gagal mengimport data: ' + error.message });
        } finally {
            connection.release();
        }
    }
};

module.exports = importController;
