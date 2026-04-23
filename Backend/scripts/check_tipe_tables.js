const pool = require('./src/config/db');
async function check() {
    try {
        const [rows] = await pool.query("SHOW TABLES LIKE 'master_tipe_%'");
        console.log("Tables found:", rows);
        const [columns1] = await pool.query("SHOW COLUMNS FROM master_bidang_instansi");
        console.log("master_bidang_instansi columns:", columns1.map(c => c.Field));
        const [columns2] = await pool.query("SHOW COLUMNS FROM master_sub_bidang_instansi");
        console.log("master_sub_bidang_instansi columns:", columns2.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
