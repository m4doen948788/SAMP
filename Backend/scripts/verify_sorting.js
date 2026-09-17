const pool = require('./src/config/db');

async function run() {
    try {
        const [rows] = await pool.query(`
            SELECT instansi FROM master_instansi_daerah 
            WHERE deleted_at IS NULL 
            ORDER BY 
                CASE 
                    WHEN instansi LIKE 'Sekretariat Daerah%' THEN 1
                    WHEN instansi LIKE 'Sekretariat%' THEN 2
                    WHEN instansi = 'Inspektorat' THEN 3
                    WHEN instansi LIKE 'Dinas%' THEN 4
                    WHEN instansi LIKE 'Badan%' THEN 5
                    WHEN instansi LIKE 'Kecamatan%' THEN 6
                    ELSE 7
                END, 
                instansi ASC
            LIMIT 20
        `);
        console.log('Sorted Instansi Data (First 20):');
        console.log(JSON.stringify(rows, null, 2));

        const [rowsLast] = await pool.query(`
            SELECT instansi FROM master_instansi_daerah 
            WHERE deleted_at IS NULL 
            ORDER BY 
                CASE 
                    WHEN instansi LIKE 'Sekretariat Daerah%' THEN 1
                    WHEN instansi LIKE 'Sekretariat%' THEN 2
                    WHEN instansi = 'Inspektorat' THEN 3
                    WHEN instansi LIKE 'Dinas%' THEN 4
                    WHEN instansi LIKE 'Badan%' THEN 5
                    WHEN instansi LIKE 'Kecamatan%' THEN 6
                    ELSE 7
                END, 
                instansi ASC
            DESC
            LIMIT 10
        `);
        console.log('Sorted Instansi Data (Last 10 - Inverse order):');
        console.log(JSON.stringify(rowsLast, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
