const pool = require('../Backend/src/config/db');

async function testQuery() {
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.id, p.nama_lengkap, p.nip, p.is_active,
                b.nama_bidang as bidang,
                j.jabatan,
                i.instansi as nama_instansi
            FROM profil_pegawai p
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_instansi_daerah i ON p.instansi_id = i.id
            WHERE (p.nama_lengkap LIKE '%Iqmal%' OR p.nip LIKE '%Iqmal%') 
            AND p.instansi_id = 2
            ORDER BY p.nama_lengkap ASC
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testQuery();
