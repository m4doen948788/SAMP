const pool = require('../src/config/db');

async function migrate() {
    console.log('[Migration] Creating tematik_dokumen_wajib table...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tematik_dokumen_wajib (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tematik_id INT NOT NULL,
                kode_dokumen VARCHAR(50) NOT NULL,
                judul_dokumen VARCHAR(255) NOT NULL,
                deskripsi TEXT NULL,
                dokumen_id INT NULL,
                file_path VARCHAR(255) NULL,
                file_name VARCHAR(255) NULL,
                nomor_dokumen VARCHAR(100) NULL,
                tahun INT NULL,
                tanggal_penetapan DATE NULL,
                keterangan TEXT NULL,
                updated_by INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tematik_id (tematik_id),
                INDEX idx_kode_dokumen (kode_dokumen)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('[Migration] Table tematik_dokumen_wajib created successfully.');

        // Default mandatory document slots
        const defaultSlots = [
            { kode: 'sk_tim', judul: 'SK Tim Koordinasi / Pokja Tematik', desc: 'Surat Keputusan Bupati / Kepala Daerah pembentukan Tim Koordinasi Pokja Tematik.' },
            { kode: 'rad', judul: 'Rencana Aksi Daerah (RAD) / Grand Design', desc: 'Dokumen master plan / rencana aksi lintas sektor pencapaian target tematik.' },
            { kode: 'sop', judul: 'SOP & Pedoman Teknis Pelaksanaan', desc: 'Standar operasional prosedur penanganan, tata laksana, dan intervensi program.' },
            { kode: 'evaluasi', judul: 'Laporan Evaluasi & Monev Berkala', desc: 'Laporan capaian semesteran/tahunan, evaluasi intervensi, dan rekomendasi tindak lanjut.' },
            { kode: 'regulasi', judul: 'Regulasi Daerah / Perbup Pendukung', desc: 'Peraturan Bupati / Daerah yang menjadi payung hukum pelaksanaan tematik.' }
        ];

        // Seed slots for all existing master_tematik if not already seeded
        const [tematiks] = await pool.query('SELECT id, nama FROM master_tematik');
        console.log(`[Migration] Checking mandatory document slots for ${tematiks.length} tematik entries...`);

        let insertedCount = 0;
        for (const t of tematiks) {
            for (const slot of defaultSlots) {
                const [existing] = await pool.query(
                    'SELECT id FROM tematik_dokumen_wajib WHERE tematik_id = ? AND kode_dokumen = ?',
                    [t.id, slot.kode]
                );
                if (existing.length === 0) {
                    await pool.query(
                        'INSERT INTO tematik_dokumen_wajib (tematik_id, kode_dokumen, judul_dokumen, deskripsi) VALUES (?, ?, ?, ?)',
                        [t.id, slot.kode, slot.judul, slot.desc]
                    );
                    insertedCount++;
                }
            }
        }
        console.log(`[Migration] Seeding complete. Inserted ${insertedCount} default mandatory document slots.`);
        process.exit(0);
    } catch (err) {
        console.error('[Migration Error]:', err);
        process.exit(1);
    }
}

migrate();
