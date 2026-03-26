const pool = require('./db');

async function migrateKegiatan() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS kegiatan_harian_pegawai (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profil_pegawai_id INT NOT NULL,
        tanggal DATE NOT NULL,
        tipe_kegiatan ENUM('C', 'DL', 'S', 'DLB', 'RM') NOT NULL,
        keterangan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        UNIQUE KEY unique_pegawai_tanggal (profil_pegawai_id, tanggal),
        FOREIGN KEY (profil_pegawai_id) REFERENCES profil_pegawai(id) ON DELETE CASCADE
      )
    `);
        console.log('Table kegiatan_harian_pegawai created/verified.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrateKegiatan();
