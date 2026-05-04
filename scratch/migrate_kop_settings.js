const pool = require('../Backend/src/config/db');
async function run() {
    try {
        await pool.query('ALTER TABLE surat_templates ADD COLUMN kop_line_style VARCHAR(50) DEFAULT "double"');
        await pool.query('ALTER TABLE surat_templates ADD COLUMN has_event_details BOOLEAN DEFAULT FALSE');
        console.log('Columns added successfully');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN') {
            console.log('Columns already exist');
            process.exit(0);
        }
        console.error(err);
        process.exit(1);
    }
}
run();
