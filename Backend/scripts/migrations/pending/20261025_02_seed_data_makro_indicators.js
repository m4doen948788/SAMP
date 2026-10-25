const pool = require('../../../src/config/db');

async function run() {
    try {
        console.log('--- FORCING SEEDING OF DATA MAKRO INDICATORS & VALUES ---');

        // 1. Ensure master_satuan entries
        await pool.query("INSERT IGNORE INTO master_satuan (id, satuan) VALUES (1, 'Jiwa'), (2, 'Poin'), (3, 'Persen')");

        // 2. Ensure indicators in data_makro
        const defaultIndicators = [
            { id: 4, kode: 'IPM', nama_data: 'Indeks Pembangunan Manusia (IPM)', sumber_data: 'BPS', satuan_id: 2, urutan: 1 },
            { id: 5, kode: '', nama_data: 'Persentase Penduduk Miskin', sumber_data: 'BPS', satuan_id: 3, urutan: 2 },
            { id: 6, kode: '', nama_data: 'Prevalensi Stunting', sumber_data: 'SKI / SSGI', satuan_id: 3, urutan: 3 },
            { id: 7, kode: '', nama_data: 'Jumlah Penduduk', sumber_data: 'BPS', satuan_id: 1, urutan: 4 }
        ];

        for (const ind of defaultIndicators) {
            await pool.query(
                `INSERT INTO data_makro (id, kode, nama_data, sumber_data, satuan_id, urutan, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE 
                    nama_data = VALUES(nama_data),
                    sumber_data = VALUES(sumber_data),
                    satuan_id = VALUES(satuan_id),
                    urutan = VALUES(urutan),
                    is_active = 1`,
                [ind.id, ind.kode, ind.nama_data, ind.sumber_data, ind.satuan_id, ind.urutan]
            );
        }
        console.log('✅ 4 default data makro indicators ensured (active).');

        // 3. Ensure values in data_makro_nilai
        const defaultValues = [
            [4, 2017, 'realisasi', '69,13'],
            [4, 2018, 'realisasi', '69,69'],
            [4, 2019, 'realisasi', '70,65'],
            [4, 2020, 'realisasi', '71,63'],
            [4, 2021, 'realisasi', '71,83'],
            [4, 2022, 'realisasi', '72,45'],
            [4, 2023, 'realisasi', '73,02'],
            [4, 2024, 'realisasi', '73,63'],
            [4, 2025, 'target', '74,20'],
            [4, 2026, 'target', '74,85'],
            [5, 2017, 'realisasi', '8,57'],
            [5, 2018, 'realisasi', '7,14'],
            [5, 2019, 'realisasi', '6,66'],
            [5, 2020, 'realisasi', '7,69'],
            [5, 2021, 'realisasi', '8,13'],
            [5, 2022, 'realisasi', '7,73'],
            [5, 2023, 'realisasi', '7,27'],
            [5, 2024, 'realisasi', '7,05'],
            [5, 2025, 'realisasi', '6,26'],
            [5, 2026, 'target', '6,10'],
            [6, 2019, 'realisasi', '34,96'],
            [6, 2021, 'realisasi', '28,60'],
            [6, 2022, 'realisasi', '24,90'],
            [6, 2023, 'realisasi', '27,60'],
            [6, 2024, 'realisasi', '18,90'],
            [6, 2025, 'target', '14,00'],
            [7, 2017, 'realisasi', '5.715.009'],
            [7, 2018, 'realisasi', '5.840.907'],
            [7, 2019, 'realisasi', '5.965.410'],
            [7, 2020, 'realisasi', '5.427.068'],
            [7, 2021, 'realisasi', '5.489.536'],
            [7, 2022, 'realisasi', '5.566.838'],
            [7, 2023, 'realisasi', '5.627.021'],
            [7, 2024, 'realisasi', '5.682.303'],
            [7, 2025, 'realisasi', '5.948.925']
        ];

        for (const v of defaultValues) {
            await pool.query(
                `INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)`,
                v
            );
        }
        console.log(`✅ ${defaultValues.length} values ensured in data_makro_nilai.`);

        // 4. Ensure tematik associations
        await pool.query('INSERT IGNORE INTO data_makro_tematik (data_makro_id, tematik_id) VALUES (5, 2), (6, 3)');
        console.log('✅ Tematik links ensured for Kemiskinan and Stunting.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding data makro indicators:', err);
        process.exit(1);
    }
}

run();
