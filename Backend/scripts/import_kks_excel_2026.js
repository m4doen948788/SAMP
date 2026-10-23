const path = require('path');
const xlsx = require('xlsx');
const pool = require('../src/config/db');

// Pemetaan Sheet ke Tatanan & OPD
const SHEET_CONFIG = {
  'Kelembagaan': { tatananNomor: 0, opdId: 2, opdNama: 'Badan Perencanaan Pembangunan Riset dan Inovasi Daerah', singkatan: 'Bapperida' },
  'Dinkes':      { tatananNomor: 1, opdId: 21, opdNama: 'Dinas Kesehatan', singkatan: 'Dinkes' },
  'DKP':         { tatananNomor: 1, opdId: 31, opdNama: 'Dinas Ketahanan Pangan', singkatan: 'DKP' },
  'DISPERKIM':   { tatananNomor: 2, opdId: 28, opdNama: 'Dinas Perumahan dan Kawasan Pemukiman', singkatan: 'DPKP' },
  'DLH':         { tatananNomor: 2, opdId: 27, opdNama: 'Dinas Lingkungan Hidup', singkatan: 'DLH' },
  'DPU':         { tatananNomor: 2, opdId: 26, opdNama: 'Dinas Pekerjaan Umum', singkatan: 'DPU' },
  'Disdik':      { tatananNomor: 3, opdId: 18, opdNama: 'Dinas Pendidikan', singkatan: 'Disdik' },
  'Disdagin':    { tatananNomor: 4, opdId: 80, opdNama: 'Dinas Perdagangan dan Perindustrian', singkatan: 'Disdagin' },
  'DISPAREKRAF': { tatananNomor: 5, opdId: 38, opdNama: 'Dinas Pariwisata dan Ekonomi Kreatif', singkatan: 'Disparekraf' },
  'Dishub':      { tatananNomor: 6, opdId: 29, opdNama: 'Dinas Perhubungan', singkatan: 'Dishub' },
  'Disnaker':    { tatananNomor: 7, opdId: 19, opdNama: 'Dinas Tenaga Kerja', singkatan: 'Disnaker' },
  'DiskopUKM':   { tatananNomor: 7, opdId: 34, opdNama: 'Dinas Koperasi Usaha Kecil dan Menengah', singkatan: 'Diskop UKM' },
  'Dinsos':      { tatananNomor: 8, opdId: 6,  opdNama: 'Dinas Sosial', singkatan: 'Dinsos' },
  'DP3AP2KB':    { tatananNomor: 8, opdId: 11, opdNama: 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak, Pengendalian Penduduk dan Keluarga Berencana', singkatan: 'DP3AP2KB' },
  'BPBD':        { tatananNomor: 9, opdId: 9,  opdNama: 'Badan Penanggulangan Bencana Daerah', singkatan: 'BPBD' },
  'Damkar':      { tatananNomor: 9, opdId: 10, opdNama: 'Dinas Pemadam Kebakaran dan Penyelamatan', singkatan: 'Disdamkarmat' },
  'Satpol PP':   { tatananNomor: 9, opdId: 8,  opdNama: 'Satuan Polisi Pamong Praja', singkatan: 'Satpol PP' },
  'BPS':         { tatananNomor: 1, opdId: null, opdNama: 'Badan Pusat Statistik (BPS)', singkatan: 'BPS' }
};

const MASTER_TATANAN = [
  { nomor: 0, kode: 'KELEMBAGAAN', nama: 'Kelembagaan (Tim Pembina & Forum KKS)', bobot: 10.0, icon: 'Building2', warna: 'blue' },
  { nomor: 1, kode: 'TATANAN_1', nama: 'Tatanan 1: Kehidupan Masyarakat Sehat Mandiri', bobot: 10.0, icon: 'HeartPulse', warna: 'emerald' },
  { nomor: 2, kode: 'TATANAN_2', nama: 'Tatanan 2: Pemukiman dan Fasilitas Umum Sehat', bobot: 10.0, icon: 'Home', warna: 'teal' },
  { nomor: 3, kode: 'TATANAN_3', nama: 'Tatanan 3: Satuan Pendidikan Sehat', bobot: 10.0, icon: 'GraduationCap', warna: 'indigo' },
  { nomor: 4, kode: 'TATANAN_4', nama: 'Tatanan 4: Pasar Rakyat Sehat', bobot: 10.0, icon: 'Store', warna: 'amber' },
  { nomor: 5, kode: 'TATANAN_5', nama: 'Tatanan 5: Pariwisata Sehat', bobot: 10.0, icon: 'Palmtree', warna: 'cyan' },
  { nomor: 6, kode: 'TATANAN_6', nama: 'Tatanan 6: Transportasi dan Tertib Fasilitas Lalu Lintas Jalan', bobot: 10.0, icon: 'Bus', warna: 'orange' },
  { nomor: 7, kode: 'TATANAN_7', nama: 'Tatanan 7: Perkantoran dan Perindustrian Sehat', bobot: 10.0, icon: 'Briefcase', warna: 'slate' },
  { nomor: 8, kode: 'TATANAN_8', nama: 'Tatanan 8: Perlindungan Sosial', bobot: 10.0, icon: 'ShieldCheck', warna: 'purple' },
  { nomor: 9, kode: 'TATANAN_9', nama: 'Tatanan 9: Pencegahan dan Penanganan Bencana', bobot: 10.0, icon: 'AlertTriangle', warna: 'rose' }
];

function parseKriteria(skalaText) {
  if (!skalaText || typeof skalaText !== 'string') return [];
  const lines = skalaText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  let currentSkor = null;
  let currentText = '';

  for (const line of lines) {
    const match = line.match(/(?:^\d+[\.\)]\s*)?Nilai\s*(\d+)\s*(?:jika|apabila)?\s*(.*)/i);
    if (match) {
      if (currentSkor !== null) {
        items.push({ skor: parseInt(currentSkor, 10), kriteria: currentText.trim() });
      }
      currentSkor = match[1];
      currentText = (match[2] ? 'jika ' + match[2] : line);
    } else {
      if (currentSkor !== null) {
        currentText += ' ' + line;
      }
    }
  }
  if (currentSkor !== null) {
    items.push({ skor: parseInt(currentSkor, 10), kriteria: currentText.trim() });
  }

  if (items.length === 0 && skalaText.trim().length > 0) {
    items.push({ skor: 100, kriteria: skalaText.trim() });
  }

  return items;
}

async function runImport() {
  const filePath = path.join(__dirname, '../data/Instrumen Penilaian KKS 2026 (1).xlsx');
  console.log(`--- Membaca file instrumen: ${filePath} ---`);

  const wb = xlsx.readFile(filePath);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const TAHUN = 2026;

    // 1. Pastikan kks_periode 2026 ada
    console.log(`1. Memeriksa kks_periode tahun ${TAHUN}...`);
    await connection.query(`
      INSERT INTO kks_periode (tahun, nama_periode, status, target_predikat, keterangan)
      VALUES (?, ?, 'buka_pengisian', 'Swasti Saba Wistara', 'Instrumen Penilaian Mandiri KKS Kabupaten Bogor 2026')
      ON DUPLICATE KEY UPDATE nama_periode = VALUES(nama_periode), status = VALUES(status);
    `, [TAHUN, `Penilaian KKS Tahun ${TAHUN}`]);

    // 2. Buat atau perbarui master 10 Tatanan untuk tahun 2026
    console.log(`2. Menyiapkan master 10 Tatanan tahun ${TAHUN}...`);
    const tatananMap = {}; // nomor_tatanan -> tatanan_id

    for (const t of MASTER_TATANAN) {
      const [existing] = await connection.query(
        'SELECT id FROM kks_tatanan WHERE tahun = ? AND nomor_tatanan = ?',
        [TAHUN, t.nomor]
      );
      if (existing.length > 0) {
        tatananMap[t.nomor] = existing[0].id;
        await connection.query(
          'UPDATE kks_tatanan SET nama_tatanan = ?, bobot = ?, icon = ?, warna_tema = ? WHERE id = ?',
          [t.nama, t.bobot, t.icon, t.warna, existing[0].id]
        );
      } else {
        const [res] = await connection.query(`
          INSERT INTO kks_tatanan (tahun, nomor_tatanan, kode_tatanan, nama_tatanan, bobot, icon, warna_tema, urutan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [TAHUN, t.nomor, t.kode, t.nama, t.bobot, t.icon, t.warna, t.nomor + 1]);
        tatananMap[t.nomor] = res.insertId;
      }
    }

    console.log('Tatanan Map:', tatananMap);

    // 3. Bersihkan indikator lama tahun 2026 sebelum import agar tidak duplikat
    console.log(`3. Menghapus indikator lama tahun ${TAHUN} (jika ada)...`);
    await connection.query('DELETE FROM kks_indikator WHERE tahun = ?', [TAHUN]);

    // 4. Proses masing-masing Sheet OPD
    let totalIndikator = 0;
    let totalKriteria = 0;

    for (const sheetName of wb.SheetNames) {
      if (sheetName === 'Sheet1' || !SHEET_CONFIG[sheetName]) {
        console.log(`Melewati sheet: ${sheetName}`);
        continue;
      }

      const conf = SHEET_CONFIG[sheetName];
      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      console.log(`--> Memproses Sheet [${sheetName}] (Tatanan: ${conf.tatananNomor}, OPD: ${conf.singkatan}) - ${rows.length} baris raw`);

      const tatananId = tatananMap[conf.tatananNomor];

      if (sheetName === 'Kelembagaan') {
        // Logika parsing sheet Kelembagaan
        let currentKomponen = 'Tim Pembina';
        let subIndex = 1;

        for (let r = 6; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          if (row[1] && typeof row[1] === 'string' && row[1].trim().length > 0) {
            currentKomponen = row[1].trim();
          }

          const subNama = row[2] ? String(row[2]).trim() : '';
          if (!subNama) continue;

          const namaIndikator = `${currentKomponen} - ${subNama}`;
          const defOperasional = row[3] ? String(row[3]).trim() : '';
          const sumberData = row[4] ? String(row[4]).trim() : '';
          const buktiDukung = row[5] ? String(row[5]).trim() : '';
          const skalaPenilaian = row[6] ? String(row[6]).trim() : '';
          const catatan = row[9] ? String(row[9]).trim() : '';

          const [insInd] = await connection.query(`
            INSERT INTO kks_indikator (
              tahun, tatanan_id, nomor_indikator, nama_indikator,
              definisi_operasional, sumber_data, bukti_dukung_dibutuhkan,
              instansi_pengampu_id, instansi_pengampu_nama, catatan_khusus, urutan
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            TAHUN, tatananId, `K.${subIndex}`, namaIndikator,
            defOperasional, sumberData, buktiDukung,
            conf.opdId, conf.opdNama, catatan, subIndex
          ]);

          const indikatorId = insInd.insertId;
          totalIndikator++;
          subIndex++;

          // Kriteria
          const kriteriaList = parseKriteria(skalaPenilaian);
          for (let k = 0; k < kriteriaList.length; k++) {
            await connection.query(`
              INSERT INTO kks_kriteria_skala (indikator_id, skor, kriteria, urutan)
              VALUES (?, ?, ?, ?)
            `, [indikatorId, kriteriaList[k].skor, kriteriaList[k].kriteria, k + 1]);
            totalKriteria++;
          }
        }
      } else {
        // Sheet OPD Standar
        // Header di row 2, data mulai row 4
        let indIndex = 1;

        for (let r = 4; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          // Nomor indikator ada di row[0]
          const noVal = row[0];
          const rawNama = row[1] ? String(row[1]).trim() : '';
          if (!rawNama || rawNama.length < 3) continue;

          const nomorInd = noVal !== undefined && noVal !== null ? String(noVal).trim() : `${indIndex}`;
          const pengampuText = row[2] ? String(row[2]).trim() : '';
          const defOperasional = row[3] ? String(row[3]).trim() : '';
          const sumberData = row[4] ? String(row[4]).trim() : '';
          const buktiDukung = row[5] ? String(row[5]).trim() : '';
          const skalaPenilaian = row[6] ? String(row[6]).trim() : '';
          const catatan = row[row.length - 1] && typeof row[row.length - 1] === 'string' ? row[row.length - 1].trim() : '';

          const [insInd] = await connection.query(`
            INSERT INTO kks_indikator (
              tahun, tatanan_id, nomor_indikator, nama_indikator,
              definisi_operasional, sumber_data, bukti_dukung_dibutuhkan,
              instansi_pengampu_id, instansi_pengampu_nama, catatan_khusus, urutan
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            TAHUN, tatananId, nomorInd, rawNama,
            defOperasional, sumberData, buktiDukung,
            conf.opdId, conf.opdNama, catatan, indIndex
          ]);

          const indikatorId = insInd.insertId;
          totalIndikator++;
          indIndex++;

          // Kriteria skala nilai
          const kriteriaList = parseKriteria(skalaPenilaian);
          for (let k = 0; k < kriteriaList.length; k++) {
            await connection.query(`
              INSERT INTO kks_kriteria_skala (indikator_id, skor, kriteria, urutan)
              VALUES (?, ?, ?, ?)
            `, [indikatorId, kriteriaList[k].skor, kriteriaList[k].kriteria, k + 1]);
            totalKriteria++;
          }
        }
      }
    }

    await connection.commit();
    console.log(`\n========================================`);
    console.log(`✅ BERHASIL MENGIMPORT SELURUH INSTRUMEN KKS 2026!`);
    console.log(`📊 Total Indikator Tersimpan: ${totalIndikator}`);
    console.log(`🎯 Total Butir Kriteria Skala: ${totalKriteria}`);
    console.log(`========================================\n`);

    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('❌ Gagal mengimpor file Excel KKS:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

runImport();
