const pool = require('./src/config/db');

async function check() {
    try {
        const [templates] = await pool.query('DESCRIBE surat_templates');
        console.log('SURAT_TEMPLATES SCHEMA:');
        console.table(templates);

        const [surat] = await pool.query('DESCRIBE surat');
        console.log('SURAT SCHEMA:');
        console.table(surat);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
