const pool = require('./src/config/db');

async function checkAndFixSchema() {
    console.log('Checking database schema...');
    try {
        // Check kegiatan_manajemen
        const [colsM] = await pool.query('DESCRIBE kegiatan_manajemen');
        const fieldsM = colsM.map(c => c.Field);
        
        const missingM = [
            'tanggal_akhir', 
            'surat_undangan_masuk_id', 
            'surat_undangan_keluar_id', 
            'bahan_desk_id', 
            'paparan_id'
        ].filter(f => !fieldsM.includes(f));

        for (const col of missingM) {
            console.log(`Adding missing column: ${col} to kegiatan_manajemen`);
            if (col === 'tanggal_akhir') {
                await pool.query('ALTER TABLE kegiatan_manajemen ADD COLUMN tanggal_akhir DATE DEFAULT NULL AFTER tanggal');
            } else {
                await pool.query(`ALTER TABLE kegiatan_manajemen ADD COLUMN ${col} INT DEFAULT NULL`);
            }
        }

        // Check kegiatan_manajemen_dokumen
        const [colsD] = await pool.query('DESCRIBE kegiatan_manajemen_dokumen');
        const fieldsD = colsD.map(c => c.Field);
        if (!fieldsD.includes('dokumen_id')) {
            console.log('Adding missing column: dokumen_id to kegiatan_manajemen_dokumen');
            await pool.query('ALTER TABLE kegiatan_manajemen_dokumen ADD COLUMN dokumen_id INT DEFAULT NULL');
        }

        // Check master_tipe_kegiatan
        const [tables] = await pool.query('SHOW TABLES LIKE "master_tipe_kegiatan"');
        if (tables.length === 0) {
            console.log('Creating master_tipe_kegiatan table...');
            await pool.query(`
                CREATE TABLE master_tipe_kegiatan (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nama VARCHAR(255) NOT NULL,
                    parent_id INT DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // Seed it with some defaults
            await pool.query(`
                INSERT INTO master_tipe_kegiatan (nama, parent_id) VALUES 
                ('Rapat Mamin', NULL),
                ('Rapat Luar Bidang', NULL),
                ('Cuti', NULL),
                ('Sakit', NULL)
            `);
            const [rows] = await pool.query('SELECT id, nama FROM master_tipe_kegiatan');
            const rapatMamin = rows.find(r => r.nama === 'Rapat Mamin');
            const rapatLuar = rows.find(r => r.nama === 'Rapat Luar Bidang');
            if (rapatMamin && rapatLuar) {
                await pool.query(`
                    INSERT INTO master_tipe_kegiatan (nama, parent_id) VALUES 
                    ('Rapat Mamin Offline', ${rapatMamin.id}),
                    ('Rapat Mamin Online', ${rapatMamin.id}),
                    ('Rapat Luar Bidang Offline', ${rapatLuar.id}),
                    ('Rapat Luar Bidang Online', ${rapatLuar.id})
                `);
            }
        }

        console.log('Schema check and fix completed.');
    } catch (err) {
        console.error('Schema check/fix failed:', err);
    } finally {
        process.exit(0);
    }
}

checkAndFixSchema();
