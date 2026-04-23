const ExcelJS = require('exceljs');
const path = require('path');
const pool = require('./src/config/db');

async function sync() {
    console.log('Starting synchronization (v4 - correct columns)...');
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'KODEFIKASI SIPD KEMENDAGRI 900.1.15.5-3406-24+Pemutakhiran.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets.find(s => s.name === 'ALL') || workbook.worksheets[0];
    
    const urusans = {};
    const bidangs = {}; 
    const programs = {}; 
    const kegiatans = {};
    const subkegiatans = {};

    console.log('Building hierarchy in memory...');
    for (let i = 3; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        // Corrected columns based on Excel structure
        const codeU = row.getCell(1).text.trim();
        const codeB = row.getCell(2).text.trim();
        const codeP = row.getCell(3).text.trim();
        const codeK = row.getCell(4).text.trim();
        const codeS = row.getCell(5).text.trim();
        const name = row.getCell(6).text.trim();
        const kin = row.getCell(7).text.trim();
        const ind = row.getCell(8).text.trim();
        const sat = row.getCell(9).text.trim();

        if (!name && !codeU) continue;

        if (codeU) {
            if (!urusans[codeU]) urusans[codeU] = { name: (codeU === 'X' ? 'UNSUR PENUNJANG' : null), id: null };
            if (name && !codeB) urusans[codeU].name = name;

            if (codeB) {
                if (!bidangs[codeU]) bidangs[codeU] = {};
                if (!bidangs[codeU][codeB]) bidangs[codeU][codeB] = { name: (codeB === 'XX' ? 'PENUNJANG URUSAN' : null), id: null };
                if (name && !codeP) bidangs[codeU][codeB].name = name;

                if (codeP) {
                    if (!programs[codeU]) programs[codeU] = {};
                    if (!programs[codeU][codeB]) programs[codeU][codeB] = {};
                    if (!programs[codeU][codeB][codeP]) programs[codeU][codeB][codeP] = { name: null, id: null };
                    if (name && !codeK) programs[codeU][codeB][codeP].name = name;

                    if (codeK) {
                        if (!kegiatans[codeU]) kegiatans[codeU] = {};
                        if (!kegiatans[codeU][codeB]) kegiatans[codeU][codeB] = {};
                        if (!kegiatans[codeU][codeB][codeP]) kegiatans[codeU][codeB][codeP] = {};
                        if (!kegiatans[codeU][codeB][codeP][codeK]) kegiatans[codeU][codeB][codeP][codeK] = { name: null, id: null };
                        if (name && !codeS) kegiatans[codeU][codeB][codeP][codeK].name = name;

                        if (codeS) {
                            if (!subkegiatans[codeU]) subkegiatans[codeU] = {};
                            if (!subkegiatans[codeU][codeB]) subkegiatans[codeU][codeB] = {};
                            if (!subkegiatans[codeU][codeB][codeP]) subkegiatans[codeU][codeB][codeP] = {};
                            if (!subkegiatans[codeU][codeB][codeP][codeK]) subkegiatans[codeU][codeB][codeP][codeK] = {};
                            subkegiatans[codeU][codeB][codeP][codeK][codeS] = { name, kin, ind, sat, id: null };
                        }
                    }
                }
            }
        }
    }

    const touched = { urusan: [], bidang: [], program: [], kegiatan: [], sub_kegiatan: [] };

    console.log('Upserting to database...');
    // Urusan
    for (const [codeU, dataU] of Object.entries(urusans)) {
        const [existing] = await pool.query('SELECT id FROM master_urusan WHERE kode_urusan = ?', [codeU]);
        if (existing.length > 0) {
            dataU.id = existing[0].id;
            if (dataU.name) await pool.query('UPDATE master_urusan SET urusan = ? WHERE id = ?', [dataU.name, dataU.id]);
        } else {
            const [res] = await pool.query('INSERT INTO master_urusan (kode_urusan, urusan) VALUES (?, ?)', [codeU, dataU.name || '-']);
            dataU.id = res.insertId;
        }
        touched.urusan.push(dataU.id);

        // Bidang
        if (bidangs[codeU]) {
            for (const [codeB, dataB] of Object.entries(bidangs[codeU])) {
                const [existingB] = await pool.query('SELECT id FROM master_bidang_urusan WHERE kode_urusan = ? AND (parent_id = ? OR parent_id IS NULL)', [codeB, dataU.id]);
                if (existingB.length > 0) {
                    dataB.id = existingB[0].id;
                    await pool.query('UPDATE master_bidang_urusan SET urusan = ?, parent_id = ? WHERE id = ?', [dataB.name || '-', dataU.id, dataB.id]);
                } else {
                    const [resB] = await pool.query('INSERT INTO master_bidang_urusan (kode_urusan, urusan, parent_id) VALUES (?, ?, ?)', [codeB, dataB.name || '-', dataU.id]);
                    dataB.id = resB.insertId;
                }
                touched.bidang.push(dataB.id);

                // Program
                if (programs[codeU] && programs[codeU][codeB]) {
                    for (const [codeP, dataP] of Object.entries(programs[codeU][codeB])) {
                        const [existingP] = await pool.query('SELECT id FROM master_program WHERE kode_program = ? AND urusan_id = ?', [codeP, dataB.id]);
                        if (existingP.length > 0) {
                            dataP.id = existingP[0].id;
                            if (dataP.name) await pool.query('UPDATE master_program SET nama_program = ? WHERE id = ?', [dataP.name, dataP.id]);
                        } else {
                            const [resP] = await pool.query('INSERT INTO master_program (kode_program, nama_program, urusan_id) VALUES (?, ?, ?)', [codeP, dataP.name || '-', dataB.id]);
                            dataP.id = resP.insertId;
                        }
                        touched.program.push(dataP.id);

                        // Kegiatan
                        if (kegiatans[codeU] && kegiatans[codeU][codeB] && kegiatans[codeU][codeB][codeP]) {
                            for (const [codeK, dataK] of Object.entries(kegiatans[codeU][codeB][codeP])) {
                                const [existingK] = await pool.query('SELECT id FROM master_kegiatan WHERE kode_kegiatan = ? AND program_id = ?', [codeK, dataP.id]);
                                if (existingK.length > 0) {
                                    dataK.id = existingK[0].id;
                                    if (dataK.name) await pool.query('UPDATE master_kegiatan SET nama_kegiatan = ? WHERE id = ?', [dataK.name, dataK.id]);
                                } else {
                                    const [resK] = await pool.query('INSERT INTO master_kegiatan (kode_kegiatan, nama_kegiatan, program_id) VALUES (?, ?, ?)', [codeK, dataK.name || '-', dataP.id]);
                                    dataK.id = resK.insertId;
                                }
                                touched.kegiatan.push(dataK.id);

                                // Sub Kegiatan
                                if (subkegiatans[codeU] && subkegiatans[codeU][codeB] && subkegiatans[codeU][codeB][codeP] && subkegiatans[codeU][codeB][codeP][codeK]) {
                                    for (const [codeS, dataS] of Object.entries(subkegiatans[codeU][codeB][codeP][codeK])) {
                                        const [existingS] = await pool.query('SELECT id FROM master_sub_kegiatan WHERE kode_sub_kegiatan = ? AND kegiatan_id = ?', [codeS, dataK.id]);
                                        if (existingS.length > 0) {
                                            dataS.id = existingS[0].id;
                                            await pool.query('UPDATE master_sub_kegiatan SET nama_sub_kegiatan = ?, kinerja = ?, indikator = ?, satuan = ? WHERE id = ?', [dataS.name, dataS.kin, dataS.ind, dataS.sat, dataS.id]);
                                        } else {
                                            const [resS] = await pool.query('INSERT INTO master_sub_kegiatan (kode_sub_kegiatan, nama_sub_kegiatan, kinerja, indikator, satuan, kegiatan_id) VALUES (?, ?, ?, ?, ?, ?)', [codeS, dataS.name, dataS.kin, dataS.ind, dataS.sat, dataK.id]);
                                            dataS.id = resS.insertId;
                                        }
                                        touched.sub_kegiatan.push(dataS.id);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log('Finished Urusan ' + codeU);
    }

    console.log('Cleaning up obsolete data...');
    const cleanup = async (table, ids) => {
        if (ids.length === 0) return;
        const [res] = await pool.query('DELETE FROM ' + table + ' WHERE id NOT IN (?)', [ids]);
        console.log('Deleted ' + res.affectedRows + ' from ' + table);
    };

    await cleanup('master_sub_kegiatan', touched.sub_kegiatan);
    await cleanup('master_kegiatan', touched.kegiatan);
    await cleanup('master_program', touched.program);
    await cleanup('master_bidang_urusan', touched.bidang);
    await cleanup('master_urusan', touched.urusan);

    console.log('Synchronization complete!');
    process.exit(0);
}

sync().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
