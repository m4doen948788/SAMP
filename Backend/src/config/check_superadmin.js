const pool = require('./db');

async function checkSuperadmin() {
    try {
        const query = `
            SELECT 
                u.id as user_id, 
                u.username, 
                u.profil_pegawai_id,
                pp.nama_lengkap, 
                pp.tipe_user_id, 
                pp.instansi_id, 
                (SELECT instansi FROM master_instansi_daerah WHERE id = pp.instansi_id) as instansi_nama,
                pp.jabatan_id,
                (SELECT jabatan FROM master_jabatan WHERE id = pp.jabatan_id) as jabatan_nama
            FROM users u
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE pp.tipe_user_id = 1
        `;
        const [rows] = await pool.query(query);
        console.log('SUPERADMIN_CHECK_RESULT:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('SUPERADMIN_CHECK_ERROR:', err);
        process.exit(1);
    }
}

checkSuperadmin();
