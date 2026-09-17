const pool = require('./src/config/db');

async function analyzeRelationships() {
    try {
        console.log('--- master_urusan ---');
        const [urusan] = await pool.query('SELECT * FROM master_urusan');
        console.table(urusan.map(u => ({ id: u.id, kode: u.kode_urusan, nama: u.urusan.substring(0, 50) })));

        console.log('\n--- master_bidang_urusan (first 10) ---');
        const [bidang] = await pool.query('SELECT * FROM master_bidang_urusan LIMIT 10');
        console.table(bidang.map(b => ({ id: b.id, kode: b.kode_urusan, parent: b.parent_id, nama: b.urusan.substring(0, 50) })));

        console.log('\n--- master_program (first 10) ---');
        const [program] = await pool.query('SELECT * FROM master_program LIMIT 10');
        console.table(program.map(p => ({ id: p.id, urusan_id: p.urusan_id, kode: p.kode_program, nama: p.nama_program.substring(0, 50) })));

        if (program.length > 0) {
            const urusanId = program[0].urusan_id;
            console.log('\n--- checking master_program[0].urusan_id (' + urusanId + ') ---');
            const [b] = await pool.query('SELECT "bidang" as type, id, urusan as nama FROM master_bidang_urusan WHERE id = ?', [urusanId]);
            const [u] = await pool.query('SELECT "urusan" as type, id, urusan as nama FROM master_urusan WHERE id = ?', [urusanId]);
            console.log('Matches in master_bidang_urusan:', b);
            console.log('Matches in master_urusan:', u);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
analyzeRelationships();
