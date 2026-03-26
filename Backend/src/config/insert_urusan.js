const pool = require('./db');

async function insertUrusan() {
    const items = [
        'Pendidikan',
        'Kesehatan',
        'Pekerjaan Umum dan Penataan Ruang',
        'Perumahan dan Kawasan Permukiman',
        'Ketentraman dan Ketertiban Umum serta Perlindungan Masyarakat',
        'Sosial',
        'Tenaga Kerja',
        'Pemberdayaan Perempuan dan Perlindungan Anak',
        'Pangan',
        'Pertanahan',
        'Lingkungan Hidup',
        'Administrasi Kependudukan dan Pencatatan Sipil',
        'Pemberdayaan Masyarakat dan Desa',
        'Pengendalian Penduduk dan Keluarga Berencana',
        'Perhubungan',
        'Komunikasi dan Informatika',
        'Koperasi, Usaha Kecil, dan Menengah',
        'Penanaman Modal',
        'Kepemudaan dan Olahraga',
        'Statistik',
        'Persandian untuk Pengamanan Informasi',
        'Kebudayaan',
        'Perpustakaan',
        'Kearsipan',
        'Kelautan dan Perikanan',
        'Pariwisata',
        'Pertanian',
        'Kehutanan',
        'Energi dan Sumber Daya Mineral',
        'Perdagangan',
        'Perindustrian',
        'Transmigrasi',
        'Perencanaan',
        'Keuangan',
        'Kepegawaian',
        'Pendidikan dan Pelatihan',
        'Penelitan dan Pengembangan',
        'Pengelolaan Perbatasan',
        'Pengawasan Urusan Pemerintahan',
        'Kesatuan Bangsa dan Politik',
    ];

    try {
        const [existing] = await pool.query('SELECT urusan FROM master_urusan');
        const existingNames = existing.map(r => r.urusan);

        let inserted = 0, skipped = 0;
        for (const urusan of items) {
            if (existingNames.includes(urusan)) {
                console.log(`SKIP: ${urusan}`);
                skipped++;
            } else {
                await pool.query('INSERT INTO master_urusan (urusan) VALUES (?)', [urusan]);
                console.log(`INSERT: ${urusan}`);
                inserted++;
            }
        }
        console.log(`\nSelesai. Inserted: ${inserted}, Skipped: ${skipped}`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
insertUrusan();
