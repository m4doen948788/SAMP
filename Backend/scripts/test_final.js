const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query("SELECT id, DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal_str, DAY(tanggal) as day_num FROM kegiatan_manajemen WHERE id = 2");
        console.log('SQL Check Result:', JSON.stringify(rows[0]));
        if (rows[0].tanggal_str === '2026-04-07' && rows[0].day_num === 7) {
            console.log('SUCCESS: SQL logic is correct.');
        } else {
            console.log('FAILURE: SQL logic returned unexpected values.', rows[0]);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
