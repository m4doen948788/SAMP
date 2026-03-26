const pool = require('./src/config/db');

async function checkRoles() {
    try {
        const [rows] = await pool.query('SELECT * FROM master_tipe_user');
        console.log(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkRoles();
