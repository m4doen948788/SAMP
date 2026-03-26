const pool = require('./src/config/db');

async function finalVerify() {
    console.log('--- Checking for broken links ---');
    
    const [subOrphans] = await pool.query('SELECT COUNT(*) as count FROM master_sub_kegiatan s LEFT JOIN master_kegiatan k ON s.kegiatan_id = k.id WHERE k.id IS NULL');
    console.log('Sub-kegiatan with no kegiatan: ' + subOrphans[0].count);

    const [kegOrphans] = await pool.query('SELECT COUNT(*) as count FROM master_kegiatan k LEFT JOIN master_program p ON k.program_id = p.id WHERE p.id IS NULL');
    console.log('Kegiatan with no program: ' + kegOrphans[0].count);

    const [progOrphans] = await pool.query('SELECT COUNT(*) as count FROM master_program p LEFT JOIN master_bidang_urusan b ON p.urusan_id = b.id WHERE b.id IS NULL');
    console.log('Program with no bidang: ' + progOrphans[0].count);

    const [bidOrphans] = await pool.query('SELECT COUNT(*) as count FROM master_bidang_urusan b LEFT JOIN master_urusan u ON b.parent_id = u.id WHERE u.id IS NULL');
    console.log('Bidang with no urusan: ' + bidOrphans[0].count);

    console.log('\n--- Full Hierarchy Sample (from mid-table) ---');
    const [sample] = await pool.query('SELECT u.kode_urusan, b.kode_urusan as kode_bidang, p.kode_program, k.kode_kegiatan, s.kode_sub_kegiatan, s.nama_sub_kegiatan FROM master_sub_kegiatan s INNER JOIN master_kegiatan k ON s.kegiatan_id = k.id INNER JOIN master_program p ON k.program_id = p.id INNER JOIN master_bidang_urusan b ON p.urusan_id = b.id INNER JOIN master_urusan u ON b.parent_id = u.id LIMIT 10 OFFSET 1000');
    
    console.table(sample.map(s => {
        return {
            code: s.kode_urusan + '.' + s.kode_bidang + '.' + s.kode_program + '.' + s.kode_kegiatan + '.' + s.kode_sub_kegiatan,
            name: s.nama_sub_kegiatan.substring(0, 50)
        };
    }));

    process.exit(0);
}

finalVerify();
