const pool = require('./src/config/db');

async function check() {
    try {
        const [pp] = await pool.query('DESCRIBE profil_pegawai');
        console.log('--- profil_pegawai ---');
        console.table(pp);

        const [sb] = await pool.query('DESCRIBE master_sub_bidang_instansi');
        console.log('--- master_sub_bidang_instansi ---');
        console.table(sb);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
