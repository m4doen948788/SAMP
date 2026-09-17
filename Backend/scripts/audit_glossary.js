const pool = require('./src/config/db');

async function audit() {
    try {
        console.log("--- Audit Tabel Database ---");
        const [tables] = await pool.query('SHOW TABLES');
        console.log("TABLES:", JSON.stringify(tables, null, 2));

        const importantTables = [
            'master_jenis_kegiatan', 
            'master_jenis_dokumen', 
            'master_klasifikasi_arsip',
            'master_jabatan',
            'master_pangkat_golongan',
            'rincian_apbd_kab_bogor'
        ];

        for (const table of importantTables) {
            try {
                const [cols] = await pool.query(`DESCRIBE ${table}`);
                console.log(`COLS ${table}:`, JSON.stringify(cols.map(c => c.Field), null, 2));
                const [data] = await pool.query(`SELECT * FROM ${table} LIMIT 10`);
                console.log(`DATA ${table}:`, JSON.stringify(data, null, 2));
            } catch (err) {
                console.log(`Skipping ${table}: Not found`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

audit();
