const db = require('../src/config/db');

async function migrate() {
    try {
        const columns = [
            'has_tujuan',
            'has_pembuka',
            'has_identitas_pegawai',
            'has_detail_cuti',
            'has_penutup'
        ];

        for (const col of columns) {
            try {
                await db.query(`ALTER TABLE surat_templates ADD COLUMN ${col} TINYINT(1) DEFAULT 0`);
                console.log(`Added column ${col}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column ${col} already exists`);
                } else {
                    throw err;
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
