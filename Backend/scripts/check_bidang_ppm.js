const pool = require('./src/config/db');

async function check() {
    try {
        console.log("--- Mencari Detail Bidang & Pejabat PPM ---");
        const [bidang] = await pool.query(`SELECT * FROM master_bidang_instansi WHERE nama_bidang LIKE '%PPM%' OR nama_bidang LIKE '%Pemerintahan%'`);
        console.log("BIDANG:", JSON.stringify(bidang, null, 2));

        if (bidang.length > 0) {
            const bidangIds = bidang.map(b => b.id);
            const [pegawai] = await pool.query(`
                SELECT p.nama_lengkap, j.jabatan, b.nama_bidang 
                FROM profil_pegawai p
                JOIN master_jabatan j ON p.jabatan_id = j.id
                JOIN master_bidang_instansi b ON p.bidang_id = b.id
                WHERE p.bidang_id IN (?) AND j.jabatan LIKE '%Kepala%'
            `, [bidangIds]);
            console.log("PEGAWAI:", JSON.stringify(pegawai, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
