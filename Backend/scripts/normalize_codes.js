const pool = require('./Backend/src/config/db');
async function run() {
    try {
        const [res1] = await pool.query("UPDATE master_tipe_kegiatan SET kode = 'RM off' WHERE kode = 'RM of'");
        const [res2] = await pool.query("UPDATE master_tipe_kegiatan SET kode = 'RLB off' WHERE kode = 'RLB of'");
        const [res3] = await pool.query("UPDATE kegiatan_harian_pegawai SET tipe_kegiatan = 'RM off' WHERE tipe_kegiatan = 'RM of'");
        const [res4] = await pool.query("UPDATE kegiatan_harian_pegawai SET tipe_kegiatan = 'RLB off' WHERE tipe_kegiatan = 'RLB of'");
        
        console.log('Master Tipe (RM):', res1.affectedRows);
        console.log('Master Tipe (RLB):', res2.affectedRows);
        console.log('Harian (RM):', res3.affectedRows);
        console.log('Harian (RLB):', res4.affectedRows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
