const pool = require('./src/config/db');

async function checkSuratSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE surat");
        console.log('Surat schema:', rows);
        
        const [rowsApp] = await pool.query("DESCRIBE surat_approvals");
        console.log('Surat Approvals schema:', rowsApp);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkSuratSchema();
