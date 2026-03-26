const pool = require('./src/config/db');

async function verify() {
    const tables = [
        'master_urusan',
        'master_bidang_urusan',
        'master_program',
        'master_kegiatan',
        'master_sub_kegiatan'
    ];
    for (const table of tables) {
        const [res] = await pool.query('SELECT COUNT(*) as count FROM ' + table);
        console.log(`Table ${table}: ${res[0].count} rows`);
    }
    
    console.log('\nSample Hierarchy Check:');
    const [sample] = await pool.query(`
        SELECT 
            u.kode_urusan, u.urusan,
            b.kode_urusan as kode_bidang, b.urusan as bidang,
            p.kode_program, p.nama_program,
            k.kode_kegiatan, k.nama_kegiatan,
            s.kode_sub_kegiatan, s.nama_sub_kegiatan
        FROM master_sub_kegiatan s
        JOIN master_kegiatan k ON s.kegiatan_id = k.id
        JOIN master_program p ON k.program_id = p.id
        JOIN master_bidang_urusan b ON p.urusan_id = b.id
        JOIN master_urusan u ON b.parent_id = u.id
        LIMIT 5
    `);
    console.table(sample);
    process.exit(0);
}

verify();
