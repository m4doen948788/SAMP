const pool = require('./db');

async function migrate() {
    try {
        console.log('🔄 Starting RPJMD & Renstra database migration...');

        // 1. rpjmd_periode
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjmd_periode (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_periode VARCHAR(100) NOT NULL,
                tahun_awal INT NOT NULL,
                tahun_akhir INT NOT NULL,
                status_dokumen ENUM('Draft', 'Rancangan Awal', 'Rancangan Akhir', 'Ditetapkan') DEFAULT 'Draft',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Insert default period if empty
        const [periods] = await pool.query(`SELECT COUNT(*) as count FROM rpjmd_periode`);
        if (periods[0].count === 0) {
            await pool.query(`
                INSERT INTO rpjmd_periode (nama_periode, tahun_awal, tahun_akhir, status_dokumen, is_active)
                VALUES ('RPJMD 2025-2029', 2025, 2029, 'Draft', TRUE)
            `);
        }

        // 2. rpjmd_visi
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjmd_visi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                periode_id INT NOT NULL,
                visi TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (periode_id) REFERENCES rpjmd_periode(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. rpjmd_misi
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjmd_misi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                visi_id INT NOT NULL,
                kode_misi VARCHAR(20) NOT NULL,
                misi TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (visi_id) REFERENCES rpjmd_visi(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. rpjmd_tujuan
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjmd_tujuan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                misi_id INT NOT NULL,
                kode_tujuan VARCHAR(20) NOT NULL,
                tujuan TEXT NOT NULL,
                indikator TEXT,
                satuan VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (misi_id) REFERENCES rpjmd_misi(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. rpjmd_sasaran
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rpjmd_sasaran (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tujuan_id INT NOT NULL,
                kode_sasaran VARCHAR(20) NOT NULL,
                sasaran TEXT NOT NULL,
                indikator TEXT,
                satuan VARCHAR(50),
                baseline_t0 VARCHAR(100),
                target_t1 VARCHAR(100),
                target_t2 VARCHAR(100),
                target_t3 VARCHAR(100),
                target_t4 VARCHAR(100),
                target_t5 VARCHAR(100),
                target_akhir VARCHAR(100),
                pagu_t1 DECIMAL(15,2) DEFAULT 0,
                pagu_t2 DECIMAL(15,2) DEFAULT 0,
                pagu_t3 DECIMAL(15,2) DEFAULT 0,
                pagu_t4 DECIMAL(15,2) DEFAULT 0,
                pagu_t5 DECIMAL(15,2) DEFAULT 0,
                pagu_total DECIMAL(17,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tujuan_id) REFERENCES rpjmd_tujuan(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. renstra_tujuan
        await pool.query(`
            CREATE TABLE IF NOT EXISTS renstra_tujuan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instansi_id INT NOT NULL,
                rpjmd_sasaran_id INT NULL,
                kode_tujuan VARCHAR(20) NOT NULL,
                tujuan TEXT NOT NULL,
                indikator TEXT,
                satuan VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rpjmd_sasaran_id) REFERENCES rpjmd_sasaran(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. renstra_sasaran
        await pool.query(`
            CREATE TABLE IF NOT EXISTS renstra_sasaran (
                id INT AUTO_INCREMENT PRIMARY KEY,
                renstra_tujuan_id INT NOT NULL,
                kode_sasaran VARCHAR(20) NOT NULL,
                sasaran TEXT NOT NULL,
                indikator TEXT,
                satuan VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (renstra_tujuan_id) REFERENCES renstra_tujuan(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 8. renstra_sub_kegiatan (Target & Pagu 5 Tahunan OPD per Sub-Kegiatan)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS renstra_sub_kegiatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                periode_id INT NOT NULL,
                instansi_id INT NOT NULL,
                renstra_sasaran_id INT NULL,
                kode_program VARCHAR(50) NOT NULL,
                nama_program VARCHAR(255) NOT NULL,
                kode_kegiatan VARCHAR(50) NOT NULL,
                nama_kegiatan VARCHAR(255) NOT NULL,
                kode_sub_kegiatan VARCHAR(50) NOT NULL,
                nama_sub_kegiatan VARCHAR(255) NOT NULL,
                indikator TEXT,
                satuan VARCHAR(50),
                baseline_t0 VARCHAR(100),
                target_t1 VARCHAR(100),
                target_t2 VARCHAR(100),
                target_t3 VARCHAR(100),
                target_t4 VARCHAR(100),
                target_t5 VARCHAR(100),
                target_akhir VARCHAR(100),
                pagu_t1 DECIMAL(15,2) DEFAULT 0,
                pagu_t2 DECIMAL(15,2) DEFAULT 0,
                pagu_t3 DECIMAL(15,2) DEFAULT 0,
                pagu_t4 DECIMAL(15,2) DEFAULT 0,
                pagu_t5 DECIMAL(15,2) DEFAULT 0,
                pagu_total DECIMAL(17,2) DEFAULT 0,
                is_quick_access BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (periode_id) REFERENCES rpjmd_periode(id) ON DELETE CASCADE,
                FOREIGN KEY (renstra_sasaran_id) REFERENCES renstra_sasaran(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 9. renstra_verifikasi (Approval & Locking Status per OPD per Periode)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS renstra_verifikasi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                periode_id INT NOT NULL,
                instansi_id INT NOT NULL,
                status ENUM('draft', 'submitted', 'revisi', 'approved') DEFAULT 'draft',
                is_locked BOOLEAN DEFAULT FALSE,
                catatan_bapperida TEXT,
                submitted_at DATETIME,
                verified_by INT,
                verified_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_periode_instansi (periode_id, instansi_id),
                FOREIGN KEY (periode_id) REFERENCES rpjmd_periode(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('✅ RPJMD & Renstra migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
}

migrate();
