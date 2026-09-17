const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const instansi_id = 2;
        const month = 4;
        const year = 2026;
        
        // Simulating the backend logic
        const [pegawai] = await pool.query(`
            SELECT p.id as profil_id, p.nama_lengkap, p.jabatan, b.nama_bidang, b.singkatan as bidang_singkatan
            FROM profil_pegawai p
            LEFT JOIN master_bidang b ON p.bidang_id = b.id
            WHERE p.instansi_id = ? AND p.is_active = 1
        `, [instansi_id]);
        
        console.log('Total Pegawai found:', pegawai.length);
        const sammy = pegawai.find(p => p.profil_id === 1);
        console.log('Sammy in list:', JSON.stringify(sammy));

        const [activities] = await pool.query(`
            SELECT profil_pegawai_id, tanggal, DAY(tanggal) as day_num, sesi, tipe_kegiatan, id_kegiatan_eksternal, nama_kegiatan, lampiran_kegiatan, keterangan
            FROM kegiatan_harian_pegawai
            WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
            AND profil_pegawai_id IN (SELECT id FROM profil_pegawai WHERE instansi_id = ?)
        `, [month, year, instansi_id]);
        
        console.log('Total Activities found:', activities.length);
        const sammyActs = activities.filter(a => a.profil_pegawai_id === 1);
        console.log('Sammy Activities:', JSON.stringify(sammyActs));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
