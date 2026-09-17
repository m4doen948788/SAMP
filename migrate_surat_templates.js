const pool = require('./Backend/src/config/db');

async function migrate() {
    try {
        console.log('Adding line_height and text_align to surat_templates...');
        await pool.query('ALTER TABLE surat_templates ADD COLUMN line_height FLOAT DEFAULT 1.5');
        await pool.query('ALTER TABLE surat_templates ADD COLUMN text_align VARCHAR(20) DEFAULT "justify"');
        console.log('Success!');
    } catch (err) {
        console.error('Migration failed or columns already exist:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
