const pool = require('./src/config/db');

async function run() {
    try {
        console.log("=== 1. SKPD LIST ===");
        const [instansi] = await pool.query("SELECT id, instansi, singkatan FROM master_instansi_daerah WHERE singkatan LIKE '%BAPPERIDA%'");
        console.table(instansi);
        
        if (instansi.length === 0) {
            console.log("No Bapperida found.");
            process.exit(0);
        }
        
        const bapperidaId = instansi[0].id;
        
        console.log("\n=== 2. SEKSI / BIDANG IN BAPPERIDA ===");
        const [bidang] = await pool.query("SELECT id, nama_bidang FROM master_bidang WHERE instansi_id = ?", [bapperidaId]);
        console.table(bidang);
        
        console.log("\n=== 3. PEGAWAI / PENANGGUNG JAWAB IN BAPPERIDA ===");
        const [pegawai] = await pool.query(`
            SELECT p.id, p.nama_lengkap, j.jabatan, b.nama_bidang
            FROM profil_pegawai p
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_bidang b ON p.bidang_id = b.id
            WHERE p.instansi_id = ?
        `, [bapperidaId]);
        console.table(pegawai);

        console.log("\n=== 4. KEGIATAN MAPPED TO BAPPERIDA ===");
        const [kegiatan] = await pool.query(`
            SELECT 
                mk.id as kegiatan_id, mk.kode_kegiatan, mk.nama_kegiatan,
                mp.nama_program,
                mki.penanggung_jawab_id, p.nama_lengkap as penanggung_jawab, j.jabatan as jabatan_pj, b.nama_bidang
            FROM mapping_kegiatan_instansi mki
            JOIN master_kegiatan mk ON mki.kegiatan_id = mk.id
            JOIN master_program mp ON mk.program_id = mp.id
            LEFT JOIN profil_pegawai p ON mki.penanggung_jawab_id = p.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_bidang b ON p.bidang_id = b.id
            WHERE mki.instansi_id = ?
        `, [bapperidaId]);
        console.table(kegiatan);

        console.log("\n=== 5. SUB-KEGIATAN MAPPED TO BAPPERIDA ===");
        const [subkegiatan] = await pool.query(`
            SELECT 
                msk.id as subkeg_id, msk.kode_sub_kegiatan, msk.nama_sub_kegiatan,
                mk.nama_kegiatan,
                mski.penanggung_jawab_id, p.nama_lengkap as penanggung_jawab, j.jabatan as jabatan_pj, b.nama_bidang
            FROM mapping_sub_kegiatan_instansi mski
            JOIN master_sub_kegiatan msk ON mski.sub_kegiatan_id = msk.id
            JOIN master_kegiatan mk ON msk.kegiatan_id = mk.id
            LEFT JOIN profil_pegawai p ON mski.penanggung_jawab_id = p.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            LEFT JOIN master_bidang b ON p.bidang_id = b.id
            WHERE mski.instansi_id = ?
        `, [bapperidaId]);
        console.table(subkegiatan);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
