const pool = require('../src/config/db');
const fs = require('fs');

async function run() {
    try {
        const [rows] = await pool.query(`
            SELECT l.id, l.nomor_surat_full, l.tanggal_surat, l.instansi_id, l.bidang_id, b.nama_bidang, i.instansi 
            FROM surat_nomor_log l 
            LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id 
            LEFT JOIN master_instansi_daerah i ON l.instansi_id = i.id 
            WHERE b.nama_bidang LIKE "%PPM%" OR b.singkatan LIKE "%PPM%"
            ORDER BY l.id DESC
        `);
        
        const output = JSON.stringify(rows, null, 2);
        fs.writeFileSync('scratch/ppm_debug.json', output, 'utf8');
        console.log('Results written to scratch/ppm_debug.json');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
