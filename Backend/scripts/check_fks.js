const pool = require('./src/config/db');

async function checkFKs() {
    const tables = [
        'master_urusan',
        'master_bidang_urusan',
        'master_program',
        'master_kegiatan',
        'master_sub_kegiatan'
    ];
    for (const table of tables) {
        console.log('\n--- ' + table + ' ---');
        try {
            const [rows] = await pool.query('SHOW CREATE TABLE ' + table);
            console.log(rows[0]['Create Table']);
        } catch (e) {
            console.error('Table ' + table + ' not found');
        }
    }
    process.exit(0);
}
checkFKs();
