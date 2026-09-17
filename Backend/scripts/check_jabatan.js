const pool = require('./Backend/src/config/db');
async function check() {
    try {
        const [rows] = await pool.query('DESCRIBE master_jabatan');
        console.log('Columns: ' + rows.map(r => r.Field).join(', '));
        const [data] = await pool.query('SELECT * FROM master_jabatan LIMIT 5');
        console.log('Data: ' + JSON.stringify(data));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
