const pool = require('./src/config/db');

async function checkRows() {
    const [b1] = await pool.query('SELECT count(*) as c FROM master_bidang');
    console.log('master_bidang rows:', b1[0].c);

    const [b2] = await pool.query('SELECT count(*) as c FROM master_bidang_urusan');
    console.log('master_bidang_urusan rows:', b2[0].c);
    
    // Check config
    const [cfg] = await pool.query('SELECT id, nama_tabel, label FROM master_data_config WHERE nama_tabel LIKE "%bidang%"');
    console.table(cfg);
    process.exit(0);
}
checkRows();
