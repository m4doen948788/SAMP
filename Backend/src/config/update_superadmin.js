const pool = require('./db');

async function updateSuperadmin() {
    try {
        const query = `
            UPDATE profil_pegawai 
            SET 
                instansi_id = NULL, 
                jabatan_id = NULL, 
                bidang_id = NULL, 
                sub_bidang_id = NULL
            WHERE tipe_user_id = 1
        `;
        const [result] = await pool.query(query);
        console.log('SUPERADMIN_UPDATE_RESULT:');
        console.log(`Affected rows: ${result.affectedRows}`);
        process.exit(0);
    } catch (err) {
        console.error('SUPERADMIN_UPDATE_ERROR:', err);
        process.exit(1);
    }
}

updateSuperadmin();
