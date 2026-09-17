const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('DESCRIBE profil_pegawai');
        console.log('Columns: ' + rows.map(r => r.Field).join(', '));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
