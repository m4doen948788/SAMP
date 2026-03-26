const pool = require('./db');

async function migrateMapping() {
    try {
        console.log('Starting mapping tables migration...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS mapping_urusan_instansi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        urusan_id INT NOT NULL,
        instansi_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_mapping_urusan FOREIGN KEY (urusan_id) REFERENCES master_urusan(id) ON DELETE CASCADE,
        CONSTRAINT fk_mapping_instansi FOREIGN KEY (instansi_id) REFERENCES master_instansi_daerah(id) ON DELETE CASCADE
      )
    `);
        console.log('Table mapping_urusan_instansi created/verified.');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS mapping_bidang_pengampu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mapping_urusan_instansi_id INT NOT NULL,
        bidang_instansi_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_mapping_base FOREIGN KEY (mapping_urusan_instansi_id) REFERENCES mapping_urusan_instansi(id) ON DELETE CASCADE,
        CONSTRAINT fk_mapping_bidang FOREIGN KEY (bidang_instansi_id) REFERENCES master_bidang_instansi(id) ON DELETE CASCADE
      )
    `);
        console.log('Table mapping_bidang_pengampu created/verified.');

        console.log('Mapping tables migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrateMapping();
