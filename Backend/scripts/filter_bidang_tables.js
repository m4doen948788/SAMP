const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const names = rows.map(r => Object.values(r)[0]);
        console.log('Bidang Tables: ' + JSON.stringify(names.filter(n => n.includes('bidang'))));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
