const pool = require('./src/config/db');

async function run() {
    try {
        const [rows] = await pool.query("SELECT * FROM master_menu WHERE nama_menu LIKE '%Instansi%'");
        console.log('Menu Data for Instansi:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
