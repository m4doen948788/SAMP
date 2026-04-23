const pool = require('./src/config/db');

async function check() {
    try {
        console.log('--- Checking Admin Bidang Users ---');
        const [users] = await pool.query(`
            SELECT 
                u.username, pp.nama_lengkap, pp.tipe_user_id, t.tipe_user,
                pp.bidang_id, b.nama_bidang, b.singkatan as bidang_singkatan
            FROM users u
            JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            JOIN master_tipe_user t ON pp.tipe_user_id = t.id
            LEFT JOIN master_bidang b ON pp.bidang_id = b.id
            WHERE pp.tipe_user_id = 4
        `);
        console.table(users);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
