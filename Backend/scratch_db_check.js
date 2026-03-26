const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/copy-dashboard/Backend/.env' });

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const tables = ['profil_pegawai', 'master_bidang', 'mapping_bidang_pengampu', 'mapping_urusan_instansi'];
    
    for (const table of tables) {
        try {
            const [cols] = await p.query(`DESCRIBE ${table}`);
            console.log(`Columns in ${table}:`, cols.map(c => `${c.Field} (${c.Type})`));
        } catch (err) {
            console.error(`Error checking ${table}:`, err.message);
        }
    }

    await p.end();
})();
