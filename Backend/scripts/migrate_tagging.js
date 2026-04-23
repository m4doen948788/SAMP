const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dokumen_tematik (
                dokumen_id INT NOT NULL,
                tematik_id INT NOT NULL,
                PRIMARY KEY (dokumen_id, tematik_id),
                FOREIGN KEY (dokumen_id) REFERENCES dokumen_upload(id) ON DELETE CASCADE,
                FOREIGN KEY (tematik_id) REFERENCES master_tematik(id) ON DELETE CASCADE
            )
        `);
        console.log('SUCCESS: Tabel dokumen_tematik berhasil dibuat!');
        process.exit(0);
    } catch (err) {
        console.error('ERROR during migration:', err.message);
        process.exit(1);
    }
}

migrate();
