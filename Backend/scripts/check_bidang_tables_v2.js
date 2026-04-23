const pool = require('./src/config/db');

async function check() {
    try {
        console.log('--- master_bidang ---');
        const [mb] = await pool.query('SELECT * FROM master_bidang');
        console.table(mb);

        console.log('--- master_bidang_instansi ---');
        const [mbi] = await pool.query('SELECT * FROM master_bidang_instansi');
        console.table(mbi);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
