const pool = require('./src/config/db');

const mappingRules = [
    { keywords: ['PENDIDIKAN'], instansi: 'Pendidikan' },
    { keywords: ['KESEHATAN'], instansi: 'Kesehatan' },
    { keywords: ['PEKERJAAN UMUM', 'PENATAAN RUANG'], instansi: 'Pekerjaan Umum' },
    { keywords: ['PERUMAHAN', 'KAWASAN PERMUKIMAN'], instansi: 'Perumahan' },
    { keywords: ['KETRAMPILAN', 'SATPOL', 'KETERTIBAN'], instansi: 'Polisi Pamong Praja' },
    { keywords: ['SOSIAL'], instansi: 'Sosial' },
    { keywords: ['TENAGA KERJA'], instansi: 'Tenaga Kerja' },
    { keywords: ['PANGAN'], instansi: 'Pangan' },
    { keywords: ['LINGKUNGAN HIDUP'], instansi: 'Lingkungan Hidup' },
    { keywords: ['KEPENDUDUKAN', 'CATATAN SIPIL'], instansi: 'Kependudukan' },
    { keywords: ['PEMBERDAYAAN MASYARAKAT'], instansi: 'Pemberdayaan Masyarakat' },
    { keywords: ['PENGENDALIAN PENDUDUK', 'KELUARGA BERENCANA'], instansi: 'Pengendalian Penduduk' },
    { keywords: ['PERHUBUNGAN'], instansi: 'Perhubungan' },
    { keywords: ['KOMUNIKASI', 'INFORMATIKA', 'STATISTIK', 'PERSANDIAN'], instansi: 'Komunikasi' },
    { keywords: ['KOPERASI', 'USAHA KECIL'], instansi: 'Koperasi' },
    { keywords: ['PENANAMAN MODAL'], instansi: 'Penanaman Modal' },
    { keywords: ['KEPEMUDAAN', 'OLAHRAGA'], instansi: 'Kepemudaan' },
    { keywords: ['PERPUSTAKAAN', 'KEARSIPAN'], instansi: 'Perpustakaan' },
    { keywords: ['KELAUTAN', 'PERIKANAN'], instansi: 'Kelautan' },
    { keywords: ['PARIWISATA'], instansi: 'Pariwisata' },
    { keywords: ['PERTANIAN'], instansi: 'Pertanian' },
    { keywords: ['PERDAGANGAN'], instansi: 'Perdagangan' },
    { keywords: ['PERINDUSTRIAN'], instansi: 'Perindustrian' },
    { keywords: ['KEUANGAN', 'ASET'], instansi: 'Keuangan' },
    { keywords: ['PENDAPATAN'], instansi: 'Pendapatan' },
    { keywords: ['PERENCANAAN', 'LITBANG', 'RISET', 'INOVASI'], instansi: 'Perencanaan' },
    { keywords: ['KEPEGAWAIAN', 'SUMBER DAYA MANUSIA'], instansi: 'Kepegawaian' },
    { keywords: ['KESATUAN BANGSA', 'POLITIK'], instansi: 'Kesatuan Bangsa' },
    { keywords: ['INSPEKTORAT'], instansi: 'Inspektorat' },
    { keywords: ['SEKRETARIAT DAERAH'], instansi: 'Sekretariat Daerah' },
    { keywords: ['SEKRETARIAT DEWAN', 'DPRD'], instansi: 'Sekretariat Dewan' },
    { keywords: ['KECAMATAN'], instansi: 'Kecamatan' }
];

async function autoMapping() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Fetching master data...');
        const [bidangList] = await connection.query('SELECT id, urusan FROM master_bidang_urusan');
        const [programList] = await connection.query('SELECT id, nama_program, urusan_id FROM master_program');
        const [instansiList] = await connection.query('SELECT id, instansi FROM master_instansi_daerah WHERE deleted_at IS NULL');

        console.log(`Processing ${programList.length} programs...`);
        let count = 0;

        for (const prog of programList) {
            const bidang = bidangList.find(b => b.id === prog.urusan_id);
            const searchText = `${bidang ? bidang.urusan : ''} ${prog.nama_program}`.toUpperCase();

            // Find matching rule
            const rule = mappingRules.find(r => 
                r.keywords.some(k => searchText.includes(k))
            );

            if (rule) {
                // Find matching instansi
                const instansi = instansiList.find(i => 
                    i.instansi.toUpperCase().includes(rule.instansi.toUpperCase())
                );

                if (instansi) {
                    // Check if mapping already exists
                    const [exists] = await connection.query(
                        'SELECT id FROM mapping_urusan_instansi WHERE urusan_id = ? AND program_id = ? AND instansi_id = ?',
                        [prog.urusan_id, prog.id, instansi.id]
                    );

                    if (exists.length === 0) {
                        await connection.query(
                            'INSERT INTO mapping_urusan_instansi (urusan_id, program_id, instansi_id) VALUES (?, ?, ?)',
                            [prog.urusan_id, prog.id, instansi.id]
                        );
                        count++;
                    }
                }
            }
        }

        await connection.commit();
        console.log(`Auto-mapping completed. Successfully added ${count} new mappings.`);
    } catch (err) {
        await connection.rollback();
        console.error('Error during auto-mapping:', err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

autoMapping();
