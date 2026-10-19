const pool = require('../src/config/db');

async function migrate() {
    console.log('Running migration for Draft Jadwal Teams...');

    // 1. Modify draft_jadwal_kegiatan to allow NULL for columns that are now per-team
    await pool.query(`
        ALTER TABLE draft_jadwal_kegiatan 
        MODIFY COLUMN tanggal_mulai DATE NULL,
        MODIFY COLUMN tanggal_akhir DATE NULL,
        MODIFY COLUMN jenis_kegiatan_id INT(11) NOT NULL,
        MODIFY COLUMN petugas_ids TEXT NULL;
    `);
    console.log('✅ Modified draft_jadwal_kegiatan columns');

    // 2. Create draft_jadwal_tim table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS draft_jadwal_tim (
            id INT(11) AUTO_INCREMENT PRIMARY KEY,
            draft_id INT(11) NOT NULL,
            nama_tim VARCHAR(100) NOT NULL,
            tanggal_mulai DATE NULL,
            tanggal_akhir DATE NULL,
            kota_kabupaten_id VARCHAR(10) NULL,
            kecamatan_id VARCHAR(10) NULL,
            lokasi_detail VARCHAR(255) NULL,
            petugas_ids TEXT NULL,
            keterangan TEXT NULL,
            status ENUM('draft', 'terintegrasi') DEFAULT 'draft',
            kegiatan_manajemen_id INT(11) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_draft_id (draft_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table draft_jadwal_tim verified/created');

    // 3. For any existing draft, if no team exists, create a default 'Tim 1' with existing data
    const [drafts] = await pool.query('SELECT * FROM draft_jadwal_kegiatan');
    for (const d of drafts) {
        const [teams] = await pool.query('SELECT id FROM draft_jadwal_tim WHERE draft_id = ?', [d.id]);
        if (teams.length === 0) {
            await pool.query(`
                INSERT INTO draft_jadwal_tim 
                (draft_id, nama_tim, tanggal_mulai, tanggal_akhir, kota_kabupaten_id, kecamatan_id, lokasi_detail, petugas_ids, keterangan, status, kegiatan_manajemen_id)
                VALUES (?, 'Tim 1', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                d.id, d.tanggal_mulai, d.tanggal_akhir, d.kota_kabupaten_id, d.kecamatan_id, 
                d.lokasi_detail, d.petugas_ids, d.keterangan, d.status || 'draft', d.kegiatan_manajemen_id
            ]);
            console.log(`✅ Migrated draft #${d.id} into draft_jadwal_tim`);
        }
    }

    console.log('Migration finished successfully.');
    process.exit(0);
}

migrate().catch(e => {
    console.error('Migration error:', e);
    process.exit(1);
});
