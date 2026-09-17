const pool = require('./src/config/db');

async function seedTAPD() {
    console.log('=== Seeding TAPD Group ===');
    try {
        const tapdInstansi = [
            'Sekretariat Daerah',
            'Badan Perencanaan Pembangunan dan Riset Daerah', // Bapperida
            'Badan Pengelolaan Keuangan dan Aset Daerah',
            'Badan Pengelolaan Pendapatan Daerah',
            'Inspektorat'
        ];

        for (const name of tapdInstansi) {
            const [result] = await pool.query(
                "UPDATE master_instansi_daerah SET kelompok_instansi = 'TAPD' WHERE instansi = ? AND deleted_at IS NULL",
                [name]
            );
            if (result.affectedRows > 0) {
                console.log(`Updated: ${name} -> TAPD`);
            } else {
                console.log(`Not found or already set: ${name}`);
            }
        }

        console.log('=== Seeding complete ===');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding TAPD group:', err);
        process.exit(1);
    }
}

seedTAPD();
