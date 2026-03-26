const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function run() {
    console.log('--- Debug Sorting Start ---');
    console.log('Config:', { ...dbConfig, password: '***' });

    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const query = `
            SELECT pp.nama_lengkap, j.jabatan as jabatan_nama,
                CASE 
                    WHEN j.jabatan IN ('Bupati', 'Wakil Bupati', 'Sekretaris Daerah', 'Kepala', 'Direktur') OR j.jabatan LIKE 'Kepala Badan%' THEN 1
                    WHEN j.jabatan LIKE 'Sekretaris%' OR j.jabatan = 'Wakil Direktur' THEN 2
                    WHEN j.jabatan LIKE 'Kepala Bidang%' OR j.jabatan LIKE 'Kepala Bagian%' THEN 3
                    WHEN j.jabatan LIKE 'Kepala Sub Bagian%' OR j.jabatan LIKE 'Kepala Seksi%' OR j.jabatan LIKE 'Ketua Tim%' THEN 4
                    ELSE 5
                END as sort_order
            FROM profil_pegawai pp
            LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
            ORDER BY sort_order ASC, pp.nama_lengkap ASC
        `;

        const [rows] = await conn.query(query);
        console.log('Sorting Result:');
        rows.forEach(r => {
            console.log(`[Order: ${r.sort_order}] ${r.jabatan_nama} - ${r.nama_lengkap}`);
        });

        console.log('\nAll Unique Jabatans:');
        const [jabatanRows] = await conn.query('SELECT DISTINCT jabatan FROM master_jabatan');
        jabatanRows.forEach(j => console.log(`- ${j.jabatan}`));

    } catch (e) {
        console.error('FATAL ERROR:', e);
    } finally {
        if (conn) await conn.end();
        console.log('--- Debug Sorting End ---');
    }
}

run();
