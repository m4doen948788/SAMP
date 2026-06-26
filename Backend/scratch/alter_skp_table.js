const pool = require('../src/config/db');

async function run() {
    try {
        console.log('Altering skp_pegawai_docs table...');
        await pool.query("ALTER TABLE skp_pegawai_docs MODIFY COLUMN kategori ENUM('perencanaan', 'penilaian', 'pendukung') NOT NULL");
        console.log('Table altered successfully.');
        
        const [schema] = await pool.query('DESCRIBE skp_pegawai_docs');
        console.table(schema);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
