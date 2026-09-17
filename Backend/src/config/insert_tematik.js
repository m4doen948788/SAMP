const pool = require('./db');

async function insertTematik() {
    const items = [
        'Kemiskinan',
        'Stunting',
        'Kabupaten Kota Sehat - KKS',
        'Kabupaten Layak Anak - KLA',
        'TBC',
        'Smart City',
        'Germas',
        'Pengarus Utamaan Gender - PUG',
        'P2WKSS',
        'SPM',
        'Reformasi Birokrasi - RB',
        'Masterplan / Grand Design',
        'UHC',
        'Gambaran Umum',
        'Indikator Kinerja Daerah',
        'Pengangguran',
    ];

    try {
        const [existing] = await pool.query('SELECT nama FROM master_tematik');
        const existingNames = existing.map(r => r.nama);

        let inserted = 0, skipped = 0;
        for (const nama of items) {
            if (existingNames.includes(nama)) {
                console.log(`SKIP: ${nama} (sudah ada)`);
                skipped++;
            } else {
                await pool.query('INSERT INTO master_tematik (nama) VALUES (?)', [nama]);
                console.log(`INSERT: ${nama}`);
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
insertTematik();
