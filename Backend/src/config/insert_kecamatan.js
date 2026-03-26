const pool = require('./db');

async function insertKecamatan() {
    const rawData = `Nanggung
Leuwiliang
Leuwi Sadeng
Pamijahan
Cibungbulang
Ciampea
Tenjolaya
Dramaga
Ciomas
Tamansari
Cijeruk
Cigombong
Caringin
Ciawi
Cisarua
Megamendung
Sukaraja
Babakan Madang
Sukamakmur
Cariu
Tanjungsari
Jonggol
Cileungsi
Klapanunggal
Gunung Putri
Citeureup
Cibinong
Bojonggede
Tajurhalang
Kemang
Rancabungur
Parung
Ciseeng
Gunung Sindur
Rumpin
Cigudeg
Sukajaya
Jasinga
Tenjo
Parung Panjang`;

    const items = rawData.split('\n').map(item => item.trim()).filter(item => item);

    try {
        const [existing] = await pool.query('SELECT instansi FROM master_instansi_daerah WHERE deleted_at IS NULL');
        const existingNames = existing.map(r => r.instansi);

        let inserted = 0, skipped = 0;
        for (const basename of items) {
            const instansi = `Kecamatan ${basename}`;
            if (existingNames.includes(instansi)) {
                console.log(`SKIP: ${instansi}`);
                skipped++;
            } else {
                await pool.query('INSERT INTO master_instansi_daerah (instansi, singkatan) VALUES (?, ?)', [instansi, instansi]);
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
insertKecamatan();
