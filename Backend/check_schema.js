const pool = require('./src/config/db');

async function checkSchema() {
    try {
        const [surat] = await pool.query('DESCRIBE surat');
        console.log('SURAT TABLE:');
        console.table(surat);

        const [approvals] = await pool.query('DESCRIBE surat_approvals');
        console.log('SURAT_APPROVALS TABLE:');
        console.table(approvals);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
