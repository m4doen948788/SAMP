const pool = require('./src/config/db');

async function checkConfig() {
    try {
        const [rows] = await pool.query('SELECT nama_tabel, kolom FROM master_data_config WHERE nama_tabel IN ("master_bidang_urusan", "master_program")');
        rows.forEach(r => {
            console.log(`--- ${r.nama_tabel} ---`);
            const cols = typeof r.kolom === 'string' ? JSON.parse(r.kolom) : r.kolom;
            console.log(JSON.stringify(cols, null, 2));
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkConfig();
