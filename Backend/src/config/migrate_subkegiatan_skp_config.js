const pool = require('./db');

async function migrateSubKegiatanSkpConfig() {
    try {
        console.log('Starting sub_kegiatan_skp_monthly_config table migration...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sub_kegiatan_skp_monthly_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sub_kegiatan_id INT DEFAULT NULL,
                butir_skp VARCHAR(255) DEFAULT NULL,
                bidang_id INT DEFAULT NULL,
                instansi_id INT DEFAULT NULL,
                tahun INT DEFAULT 2026,
                bulan INT NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                target_type ENUM('progress', 'output') DEFAULT 'output',
                target_description VARCHAR(255) DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_sub_keg_id (sub_kegiatan_id),
                KEY idx_butir_bidang_tahun (butir_skp(100), bidang_id, tahun)
            )
        `);

        // Check if columns exist if table was already created earlier
        const [cols] = await pool.query("SHOW COLUMNS FROM sub_kegiatan_skp_monthly_config");
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('butir_skp')) {
            await pool.query("ALTER TABLE sub_kegiatan_skp_monthly_config ADD COLUMN butir_skp VARCHAR(255) DEFAULT NULL AFTER sub_kegiatan_id");
            await pool.query("ALTER TABLE sub_kegiatan_skp_monthly_config MODIFY sub_kegiatan_id INT DEFAULT NULL");
        }
        if (!colNames.includes('bidang_id')) {
            await pool.query("ALTER TABLE sub_kegiatan_skp_monthly_config ADD COLUMN bidang_id INT DEFAULT NULL AFTER butir_skp");
        }

        console.log('Table sub_kegiatan_skp_monthly_config updated successfully.');
    } catch (err) {
        console.error('Migration sub_kegiatan_skp_monthly_config failed:', err.message);
    }
}

module.exports = migrateSubKegiatanSkpConfig;
