const pool = require('./config/db');

async function check() {
    try {
        const ids = [6, 28, 29, 30]; // urusan, program, kegiatan, sub_kegiatan
        const [rows] = await pool.query('SELECT id, nama_tabel, label, kolom FROM master_data_config WHERE id IN (?)', [ids]);
        rows.forEach(r => {
            console.log(`ID: ${r.id} (${r.nama_tabel})`);
            console.log(`LABEL: ${r.label}`);
            console.log(`KOLOM: ${r.kolom}`);
            console.log('---');
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
