const pool = require('../src/config/db');

async function checkMoreSchema() {
    try {
        const tables = ['surat_templates', 'kegiatan_harian_pegawai', 'profil_pegawai', 'master_bidang_instansi'];
        for (const table of tables) {
            try {
                const [schema] = await pool.query(`DESCRIBE ${table}`);
                console.log(`${table.toUpperCase()} TABLE:`);
                console.table(schema);
            } catch (e) {
                console.error(`Error describing ${table}: ${e.message}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMoreSchema();
