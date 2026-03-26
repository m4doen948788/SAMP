const pool = require('./src/config/db');

async function test() {
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.id as urusan_id, u.urusan as nama_urusan, 
                p.id as program_id, p.nama_program as nama_program,
                m.id, m.instansi_id, i.instansi as nama_instansi, i.singkatan as singkatan_instansi
            FROM master_bidang_urusan u
            LEFT JOIN master_program p ON u.id = p.bidang_urusan_id
            LEFT JOIN mapping_urusan_instansi m ON u.id = m.urusan_id AND (m.program_id = p.id OR (m.program_id IS NULL AND p.id IS NULL))
            LEFT JOIN master_instansi_daerah i ON m.instansi_id = i.id
            ORDER BY u.urusan ASC, p.nama_program ASC, i.instansi ASC
            LIMIT 10
        `);
        console.log('Query results:', JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error('Query failed:', err.message);
        process.exit(1);
    }
}

test();
