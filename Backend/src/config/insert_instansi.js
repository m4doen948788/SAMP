const pool = require('./db');

async function insertInstansi() {
    const items = [
        'Dinas Komunikasi dan Informatika',
        'Badan Perencanaan Pembangunan dan Riset Daerah',
        'Badan Pengelolaan Pendapatan Daerah',
        'Sekretariat Daerah',
        'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',
        'Dinas Sosial',
        'Badan Kesatuan Bangsa dan Politik',
        'Satuan Polisi Pamong Praja',
        'Badan Penanggulangan Bencana Daerah',
        'Dinas Pemadam Kebakaran',
        'Dinas Pemberdayaan Perempuan dan Perlindungan Anak, Pengendalian Penduduk dan Keluarga Berencana',
        'Dinas Kependudukan dan Pencatatan Sipil',
        'Sekretariat Dewan',
        'Inspektorat',
        'Dinas Arsip dan Perpustakaan',
        'Badan Pengelolaan Keuangan dan Aset Daerah',
        'Dinas Pemberdayaan Masyarakat dan Desa',
        'Dinas Pendidikan',
        'Dinas Tenaga Kerja',
        'Dinas Pemuda dan Olahraga',
        'Dinas Kesehatan',
        'RSUD Bakti Pajajaran',
        'RSUD Dr KH Idham Chalid',
        'RSUD Moh Noh Nur',
        'RSUD RH Satibi',
        'Dinas Pekerjaan Umum',
        'Dinas Lingkungan Hidup',
        'Dinas Perumahan Kawasan dan Pemukiman',
        'Dinas Perhubungan',
        'Kecamatan',
        'Dinas Ketahanan Pangan',
        'Dinas Perikanan dan Peternakan',
        'Dinas Tanaman Pangan Hortikultura dan Perkebunan',
        'Dinas Koperasi Usaha Kecil dan Menengah',
        'Dinas Kebudayaan',
        'Dinas Penanaman Modal Terpadu Satu Pintu',
        'Dinas Tata Ruang',
        'Dinas Pariwisata dan Ekonomi Kreatif',
    ];

    try {
        const [existing] = await pool.query('SELECT instansi FROM master_instansi_daerah WHERE deleted_at IS NULL');
        const existingNames = existing.map(r => r.instansi);

        let inserted = 0, skipped = 0;
        for (const instansi of items) {
            if (existingNames.includes(instansi)) {
                console.log(`SKIP: ${instansi}`);
                skipped++;
            } else {
                await pool.query('INSERT INTO master_instansi_daerah (instansi) VALUES (?)', [instansi]);
                console.log(`INSERT: ${instansi}`);
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
insertInstansi();
