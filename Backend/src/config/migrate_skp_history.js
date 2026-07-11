const pool = require('./db');

async function migrate() {
    try {
        console.log('🚀 Creating skp_edit_history table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS skp_edit_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                pegawai_id INT NOT NULL,
                user_id INT NOT NULL,
                tahun INT NOT NULL,
                bidang_id INT NOT NULL,
                kategori VARCHAR(50) NOT NULL,
                bulan INT,
                butir_skp VARCHAR(255),
                aksi VARCHAR(50) NOT NULL,
                keterangan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (pegawai_id),
                INDEX (user_id),
                INDEX (tahun)
            )
        `);
        console.log('✅ Table skp_edit_history created successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
