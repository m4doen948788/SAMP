const pool = require('./db');

const seed = async () => {
    try {
        console.log('🔄 Seeding RPJPD 2025-2045 Sample Data...');

        // 1. Ensure Visi 2025-2045
        let [visiList] = await pool.query("SELECT * FROM rpjpd_visi WHERE tahun_mulai = 2025 AND tahun_selesai = 2045 LIMIT 1");
        let visiId;
        if (visiList.length === 0) {
            const [res] = await pool.query(
                "INSERT INTO rpjpd_visi (tahun_mulai, tahun_selesai, visi, keterangan) VALUES (?, ?, ?, ?)",
                [2025, 2045, 'Kota Bogor Maju, Berkelanjutan, dan Sejahtera 2025-2045', 'Visi Pembangunan Jangka Panjang Daerah 20 Tahun']
            );
            visiId = res.insertId;
            console.log('✅ Created Visi RPJPD 2025-2045 with ID:', visiId);
        } else {
            visiId = visiList[0].id;
            await pool.query("UPDATE rpjpd_visi SET visi = ? WHERE id = ?", ['Kota Bogor Maju, Berkelanjutan, dan Sejahtera 2025-2045', visiId]);
            console.log('✅ Updated Visi RPJPD 2025-2045 ID:', visiId);
        }

        // 2. Misi Data
        const misiData = [
            {
                kode_misi: '1',
                misi: 'Mewujudkan Sumber Daya Manusia Berdaya Saing, Berkarakter, dan Inklusif',
                sasaran: [
                    {
                        kode_sasaran: 'S.1.1',
                        sasaran_pokok: 'Meningkatnya Kualitas Pendidikan, Kesehatan, dan Kesejahteraan Sosial Masyarakat',
                        arah: [
                            { kode: 'AK.1.1.1', arah: 'Penguatan Akses & Mutu Pelayanan Kesehatan Dasar serta Pendidikan Inklusif' },
                            { kode: 'AK.1.1.2', arah: 'Pengembangan Fasilitas Olahraga dan Pemberdayaan Pemuda Kreatif' }
                        ]
                    },
                    {
                        kode_sasaran: 'S.1.2',
                        sasaran_pokok: 'Terwujudnya Perlindungan Sosial Terpadu dan Penurunan Angka Kemiskinan Ekstrem',
                        arah: [
                            { kode: 'AK.1.2.1', arah: 'Penyelenggaraan Jaminan Sosial Berbasis Data Terpadu Kesejahteraan Sosial' }
                        ]
                    }
                ]
            },
            {
                kode_misi: '2',
                misi: 'Mewujudkan Pertumbuhan Ekonomi Inklusif Berbasis Inovasi, Perdagangan, dan Ekonomi Hijau',
                sasaran: [
                    {
                        kode_sasaran: 'S.2.1',
                        sasaran_pokok: 'Peningkatan Daya Saing UMKM, Ekonomi Kreatif, dan Pariwisata Ramah Lingkungan',
                        arah: [
                            { kode: 'AK.2.1.1', arah: 'Inkubasi Bisnis Start-up, Digitalisasi UMKM, dan Promosi Produk Lokal' },
                            { kode: 'AK.2.1.2', arah: 'Pengembangan Destinasi Wisata Heritage dan Ruang Publik Terbuka' }
                        ]
                    },
                    {
                        kode_sasaran: 'S.2.2',
                        sasaran_pokok: 'Terwujudnya Infrastruktur Perkotaan Modern, Berkelanjutan, dan Resilien terhadap Bencana',
                        arah: [
                            { kode: 'AK.2.2.1', arah: 'Pembangunan Sistem Transportasi Massal Terintegrasi dan Ramah Lingkungan' }
                        ]
                    }
                ]
            }
        ];

        for (const m of misiData) {
            let [misiRows] = await pool.query("SELECT id FROM rpjpd_misi WHERE visi_id = ? AND kode_misi = ?", [visiId, m.kode_misi]);
            let misiId;
            if (misiRows.length === 0) {
                const [r] = await pool.query("INSERT INTO rpjpd_misi (visi_id, kode_misi, misi) VALUES (?, ?, ?)", [visiId, m.kode_misi, m.misi]);
                misiId = r.insertId;
                console.log(`✅ Created Misi ${m.kode_misi}`);
            } else {
                misiId = misiRows[0].id;
                await pool.query("UPDATE rpjpd_misi SET misi = ? WHERE id = ?", [m.misi, misiId]);
            }

            for (const s of m.sasaran) {
                let [sasaranRows] = await pool.query("SELECT id FROM rpjpd_sasaran WHERE misi_id = ? AND kode_sasaran = ?", [misiId, s.kode_sasaran]);
                let sasaranId;
                if (sasaranRows.length === 0) {
                    const [sr] = await pool.query("INSERT INTO rpjpd_sasaran (misi_id, kode_sasaran, sasaran_pokok) VALUES (?, ?, ?)", [misiId, s.kode_sasaran, s.sasaran_pokok]);
                    sasaranId = sr.insertId;
                    console.log(`  ✅ Created Sasaran ${s.kode_sasaran}`);
                } else {
                    sasaranId = sasaranRows[0].id;
                    await pool.query("UPDATE rpjpd_sasaran SET sasaran_pokok = ? WHERE id = ?", [s.sasaran_pokok, sasaranId]);
                }

                for (const a of s.arah) {
                    let [arahRows] = await pool.query("SELECT id FROM rpjpd_arah_kebijakan WHERE sasaran_pokok_id = ? AND kode_arah_kebijakan = ?", [sasaranId, a.kode]);
                    if (arahRows.length === 0) {
                        await pool.query("INSERT INTO rpjpd_arah_kebijakan (sasaran_pokok_id, kode_arah_kebijakan, arah_kebijakan) VALUES (?, ?, ?)", [sasaranId, a.kode, a.arah]);
                        console.log(`    ✅ Created Arah Kebijakan ${a.kode}`);
                    } else {
                        await pool.query("UPDATE rpjpd_arah_kebijakan SET arah_kebijakan = ? WHERE id = ?", [a.arah, arahRows[0].id]);
                    }
                }
            }
        }

        console.log('🎉 RPJPD Seeding Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
