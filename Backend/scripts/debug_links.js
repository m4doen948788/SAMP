const pool = require('./src/config/db');

async function debugData() {
    console.log('--- master_urusan sample ---');
    const [u] = await pool.query('SELECT * FROM master_urusan LIMIT 3');
    console.log(u);

    console.log('\n--- master_bidang_urusan sample ---');
    const [b] = await pool.query('SELECT * FROM master_bidang_urusan LIMIT 3');
    console.log(b);

    console.log('\n--- master_program sample ---');
    const [p] = await pool.query('SELECT * FROM master_program LIMIT 3');
    console.log(p);

    console.log('\n--- master_kegiatan sample ---');
    const [k] = await pool.query('SELECT * FROM master_kegiatan LIMIT 3');
    console.log(k);

    console.log('\n--- master_sub_kegiatan sample ---');
    const [s] = await pool.query('SELECT * FROM master_sub_kegiatan LIMIT 3');
    console.log(s);

    console.log('\n--- check specific join (bidang -> urusan) ---');
    const [joinedBU] = await pool.query('SELECT b.id as bidang_id, u.id as urusan_id FROM master_bidang_urusan b JOIN master_urusan u ON b.parent_id = u.id LIMIT 3');
    console.log('Joined BU:', joinedBU);

    console.log('\n--- check specific join (program -> bidang) ---');
    const [joinedPB] = await pool.query('SELECT p.id as prog_id, b.id as bidang_id FROM master_program p JOIN master_bidang_urusan b ON p.urusan_id = b.id LIMIT 3');
    console.log('Joined PB:', joinedPB);

    process.exit(0);
}

debugData();
