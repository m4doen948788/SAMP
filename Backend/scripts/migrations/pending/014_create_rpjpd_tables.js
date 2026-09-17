const pool = require('../../src/config/db');

const up = async () => {
    try {
        console.log('🔄 Creating RPJPD tables...');

        // 1. Table rpjpd_visi
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjpd_visi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tahun_mulai INT NOT NULL,
                tahun_selesai INT NOT NULL,
                visi TEXT NOT NULL,
                keterangan TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table rpjpd_visi verified/created.');

        // 2. Table rpjpd_misi
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjpd_misi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                visi_id INT NOT NULL,
                kode_misi VARCHAR(50) NOT NULL,
                misi TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (visi_id) REFERENCES rpjpd_visi(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table rpjpd_misi verified/created.');

        // 3. Table rpjpd_sasaran
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjpd_sasaran (
                id INT AUTO_INCREMENT PRIMARY KEY,
                misi_id INT NOT NULL,
                kode_sasaran VARCHAR(50) NOT NULL,
                sasaran_pokok TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (misi_id) REFERENCES rpjpd_misi(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table rpjpd_sasaran verified/created.');

        // 4. Table rpjpd_arah_kebijakan
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjpd_arah_kebijakan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sasaran_pokok_id INT NOT NULL,
                kode_arah_kebijakan VARCHAR(50) NOT NULL,
                arah_kebijakan TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sasaran_pokok_id) REFERENCES rpjpd_sasaran(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table rpjpd_arah_kebijakan verified/created.');

        // 5. Table rpjpd_indikator
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjpd_indikator (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sasaran_pokok_id INT NOT NULL,
                nama_indikator VARCHAR(255) NOT NULL,
                satuan_id INT NULL,
                kondisi_awal_nilai DECIMAL(10,2) NULL,
                kondisi_awal_tahun INT NULL,
                target_tahap_1 DECIMAL(10,2) NULL,
                target_tahap_2 DECIMAL(10,2) NULL,
                target_tahap_3 DECIMAL(10,2) NULL,
                target_tahap_4 DECIMAL(10,2) NULL,
                keterangan TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sasaran_pokok_id) REFERENCES rpjpd_sasaran(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table rpjpd_indikator verified/created.');

        // 6. Set action_page for RPJPD in kelola_menu
        await pool.query(`
            UPDATE kelola_menu 
            SET action_page = 'rpjpd' 
            WHERE nama_menu LIKE 'RPJPD%'
        `);
        console.log('✅ Menu RPJPD linked to action_page = "rpjpd" successfully.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

up().catch(err => {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
});
