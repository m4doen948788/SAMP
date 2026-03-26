const pool = require('./db');

async function migrateMappingKegiatan() {
    try {
        console.log('Starting mapping kegiatan & sub-kegiatan tables migration...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS mapping_kegiatan_instansi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kegiatan_id INT NOT NULL,
                instansi_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_mapping_kegiatan FOREIGN KEY (kegiatan_id) REFERENCES master_kegiatan(id) ON DELETE CASCADE,
                CONSTRAINT fk_mapping_keg_instansi FOREIGN KEY (instansi_id) REFERENCES master_instansi_daerah(id) ON DELETE CASCADE,
                UNIQUE KEY unique_keg_instansi (kegiatan_id, instansi_id)
            )
        `);
        console.log('Table mapping_kegiatan_instansi created/verified.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS mapping_sub_kegiatan_instansi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sub_kegiatan_id INT NOT NULL,
                instansi_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_mapping_sub_kegiatan FOREIGN KEY (sub_kegiatan_id) REFERENCES master_sub_kegiatan(id) ON DELETE CASCADE,
                CONSTRAINT fk_mapping_subkeg_instansi FOREIGN KEY (instansi_id) REFERENCES master_instansi_daerah(id) ON DELETE CASCADE,
                UNIQUE KEY unique_subkeg_instansi (sub_kegiatan_id, instansi_id)
            )
        `);
        console.log('Table mapping_sub_kegiatan_instansi created/verified.');

        console.log('Mapping kegiatan tables migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

module.exports = migrateMappingKegiatan;
