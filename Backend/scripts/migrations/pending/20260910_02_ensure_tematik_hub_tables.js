const pool = require('../../../src/config/db');

async function run() {
    try {
        console.log('--- STARTING ENSURE TEMATIK HUB TABLES MIGRATION ---');

        // 1. Ensure dokumen_tematik table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dokumen_tematik (
                dokumen_id INT NOT NULL,
                tematik_id INT NOT NULL,
                kegiatan_id INT NOT NULL DEFAULT 0,
                PRIMARY KEY (dokumen_id, tematik_id, kegiatan_id),
                KEY tematik_id (tematik_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table dokumen_tematik verified/created.');

        // 2. Ensure master_tipe_link table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_tipe_link (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at DATETIME NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table master_tipe_link verified/created.');

        // Seed default tipe link if empty
        const [existingTypes] = await pool.query('SELECT COUNT(*) as count FROM master_tipe_link WHERE deleted_at IS NULL');
        if (existingTypes[0].count === 0) {
            const defaultTypes = ['Sistem Informasi', 'Aplikasi Daerah', 'Dokumen / Drive', 'Website Resmi', 'Lainnya'];
            for (const t of defaultTypes) {
                await pool.query('INSERT INTO master_tipe_link (nama) VALUES (?)', [t]);
            }
            console.log('✅ Default master_tipe_link seeded.');
        }

        // 3. Ensure master_aplikasi_external columns
        const [maeCols] = await pool.query('DESCRIBE master_aplikasi_external');
        const maeFields = new Set(maeCols.map(c => c.Field));

        if (maeFields.has('asal_instansi') && !maeFields.has('sumber')) {
            await pool.query('ALTER TABLE master_aplikasi_external CHANGE COLUMN asal_instansi sumber VARCHAR(255)');
            console.log('✅ Renamed asal_instansi to sumber in master_aplikasi_external.');
        } else if (!maeFields.has('sumber')) {
            await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN sumber VARCHAR(255) AFTER pembuat');
            console.log('✅ Added column sumber to master_aplikasi_external.');
        }

        if (!maeFields.has('tipe_link_id')) {
            await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tipe_link_id INT NULL AFTER sumber');
            console.log('✅ Added column tipe_link_id to master_aplikasi_external.');
        }

        if (!maeFields.has('tagging')) {
            await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tagging VARCHAR(255) NULL AFTER tipe_link_id');
            console.log('✅ Added column tagging to master_aplikasi_external.');
        }

        if (!maeFields.has('tematik_ids')) {
            await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN tematik_ids TEXT NULL AFTER tagging');
            console.log('✅ Added column tematik_ids to master_aplikasi_external.');
        }

        if (!maeFields.has('keterangan')) {
            await pool.query('ALTER TABLE master_aplikasi_external ADD COLUMN keterangan TEXT NULL AFTER tematik_ids');
            console.log('✅ Added column keterangan to master_aplikasi_external.');
        }

        // 4. Ensure master_satuan table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_satuan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                satuan VARCHAR(255) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table master_satuan verified/created.');

        // Seed default satuan if empty
        const [existingSatuan] = await pool.query('SELECT COUNT(*) as count FROM master_satuan');
        if (existingSatuan[0].count === 0) {
            const defaultSatuan = ['%', 'Orang', 'Jiwa', 'Rupiah', 'Indeks', 'Dokumen', 'Unit', 'Kasus'];
            for (const s of defaultSatuan) {
                await pool.query('INSERT INTO master_satuan (satuan) VALUES (?)', [s]);
            }
            console.log('✅ Default master_satuan seeded.');
        }

        // 5. Ensure data_makro table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kode VARCHAR(255) NULL,
                nama_data VARCHAR(255) NOT NULL,
                tematik_id INT NULL,
                sumber_data VARCHAR(255) NULL,
                satuan_id INT NULL,
                urutan INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                parent_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY tematik_id (tematik_id),
                KEY satuan_id (satuan_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table data_makro verified/created.');

        // Verify data_makro columns
        const [dmCols] = await pool.query('DESCRIBE data_makro');
        const dmFields = new Set(dmCols.map(c => c.Field));
        if (!dmFields.has('kode')) {
            await pool.query('ALTER TABLE data_makro ADD COLUMN kode VARCHAR(255) NULL AFTER id');
            console.log('✅ Added column kode to data_makro.');
        }
        if (!dmFields.has('tematik_id')) {
            await pool.query('ALTER TABLE data_makro ADD COLUMN tematik_id INT NULL AFTER nama_data');
            console.log('✅ Added column tematik_id to data_makro.');
        }

        // 6. Ensure data_makro_nilai table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_nilai (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                tahun INT NOT NULL,
                tipe ENUM('target', 'realisasi') NOT NULL DEFAULT 'realisasi',
                nilai VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_nilai (data_makro_id, tahun, tipe)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table data_makro_nilai verified/created.');

        // 7. Ensure notulen table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notulen (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kegiatan_id INT NULL,
                template_id INT NULL,
                nomor_notulen VARCHAR(100) NULL,
                perihal VARCHAR(255) NULL,
                tanggal_notulen DATE NULL,
                isi_notulen TEXT NULL,
                dokumen_id INT NULL,
                instansi_id INT NULL,
                bidang_id INT NULL,
                created_by INT NULL,
                approval_status ENUM('WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED') DEFAULT 'WAITING_APPROVAL',
                verification_slug VARCHAR(100) UNIQUE NULL,
                is_deleted TINYINT(1) DEFAULT 0,
                deleted_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table notulen verified/created.');

        console.log('--- ENSURE TEMATIK HUB TABLES MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

run();
