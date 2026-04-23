const db = require('./src/config/db');

const holidays = [
    { tanggal: '2026-01-01', keterangan: 'Tahun Baru 2026 Masehi' },
    { tanggal: '2026-01-16', keterangan: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2026-02-16', keterangan: 'Cuti Bersama Tahun Baru Imlek' },
    { tanggal: '2026-02-17', keterangan: 'Tahun Baru Imlek 2577 Kongzili' },
    { tanggal: '2026-03-18', keterangan: 'Cuti Bersama Hari Suci Nyepi' },
    { tanggal: '2026-03-19', keterangan: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
    { tanggal: '2026-03-20', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-03-21', keterangan: 'Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-03-22', keterangan: 'Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-03-23', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-03-24', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-04-03', keterangan: 'Wafat Yesus Kristus' },
    { tanggal: '2026-04-05', keterangan: 'Hari Paskah' },
    { tanggal: '2026-05-01', keterangan: 'Hari Buruh Internasional' },
    { tanggal: '2026-05-14', keterangan: 'Kenaikan Yesus Kristus' },
    { tanggal: '2026-05-15', keterangan: 'Cuti Bersama Kenaikan Yesus Kristus' },
    { tanggal: '2026-05-27', keterangan: 'Hari Raya Idul Adha 1447 H' },
    { tanggal: '2026-05-28', keterangan: 'Cuti Bersama Hari Raya Idul Adha 1447 H' },
    { tanggal: '2026-05-31', keterangan: 'Hari Raya Waisak 2570 BE' },
    { tanggal: '2026-06-01', keterangan: 'Hari Lahir Pancasila' },
    { tanggal: '2026-06-16', keterangan: 'Tahun Baru Islam 1448 H' },
    { tanggal: '2026-08-17', keterangan: 'Hari Kemerdekaan Republik Indonesia' },
    { tanggal: '2026-08-25', keterangan: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2026-12-24', keterangan: 'Cuti Bersama Hari Raya Natal' },
    { tanggal: '2026-12-25', keterangan: 'Hari Raya Natal' }
];

async function seedHolidays() {
    console.log('--- Starting 2026 Holidays Seeding ---');
    try {
        const promises = holidays.map(h => {
            return db.query(
                'INSERT INTO master_hari_libur (tanggal, keterangan) VALUES (?, ?) ON DUPLICATE KEY UPDATE keterangan = VALUES(keterangan)',
                [h.tanggal, h.keterangan]
            );
        });

        await Promise.all(promises);
        console.log(`Successfully seeded ${holidays.length} holidays for 2026.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding holidays:', error);
        process.exit(1);
    }
}

seedHolidays();
