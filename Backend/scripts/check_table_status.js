const pool = require('./src/config/db');

async function check() {
    try {
        const [pp] = await pool.query("SHOW TABLE STATUS WHERE Name = 'profil_pegawai'");
        console.log('--- profil_pegawai status ---');
        console.table(pp);

        const [sb] = await pool.query("SHOW TABLE STATUS WHERE Name = 'master_sub_bidang_instansi'");
        console.log('--- master_sub_bidang_instansi status ---');
        console.table(sb);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
