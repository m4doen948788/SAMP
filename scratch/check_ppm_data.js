const pool = require('../Backend/src/config/db');

async function checkPPM() {
    try {
        console.log('--- PEGAWAI DI BIDANG PPM (ID: 2) ---');
        const [rows] = await pool.query(`
            SELECT p.id, p.nama_lengkap, p.nip, b.nama_bidang 
            FROM profil_pegawai p
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            WHERE p.bidang_id = 2
        `);
        console.log(JSON.stringify(rows, null, 2));

        console.log('\n--- PEGAWAI DENGAN BIDANG NULL ---');
        const [nullRows] = await pool.query(`
            SELECT p.id, p.nama_lengkap, p.nip, p.bidang_id
            FROM profil_pegawai p
            WHERE p.bidang_id IS NULL
        `);
        console.log(JSON.stringify(nullRows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkPPM();
