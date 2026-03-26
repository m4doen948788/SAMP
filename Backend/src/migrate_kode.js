const pool = require('./config/db');

async function migrate() {
    try {
        console.log('--- Updating master_urusan ---');
        await pool.query('ALTER TABLE master_urusan ADD COLUMN IF NOT EXISTS kode_urusan VARCHAR(50) AFTER id');
        
        console.log('--- Updating master_sub_kegiatan ---');
        await pool.query('ALTER TABLE master_sub_kegiatan ADD COLUMN IF NOT EXISTS kinerja TEXT AFTER nama_sub_kegiatan');
        await pool.query('ALTER TABLE master_sub_kegiatan ADD COLUMN IF NOT EXISTS indikator TEXT AFTER kinerja');
        await pool.query('ALTER TABLE master_sub_kegiatan ADD COLUMN IF NOT EXISTS satuan VARCHAR(255) AFTER indikator');

        console.log('--- Updating master_data_config ---');
        
        // 6: Master Urusan
        const kolomUrusan = [
            { "nama": "Kode Urusan", "nama_db": "kode_urusan", "tipe": "string", "wajib": true },
            { "nama": "Urusan", "nama_db": "urusan", "tipe": "string", "wajib": true }
        ];
        await pool.query('UPDATE master_data_config SET kolom = ? WHERE id = 6', [JSON.stringify(kolomUrusan)]);

        // 28: Master Program
        const kolomProgram = [
            { "nama": "Urusan ID", "nama_db": "urusan_id", "tipe": "number", "wajib": true },
            { "nama": "Kode Program", "nama_db": "kode_program", "tipe": "string", "wajib": true },
            { "nama": "Nama Program", "nama_db": "nama_program", "tipe": "text", "wajib": true }
        ];
        await pool.query('UPDATE master_data_config SET kolom = ? WHERE id = 28', [JSON.stringify(kolomProgram)]);

        // 29: Master Kegiatan
        const kolomKegiatan = [
            { "nama": "Program ID", "nama_db": "program_id", "tipe": "number", "wajib": true },
            { "nama": "Kode Kegiatan", "nama_db": "kode_kegiatan", "tipe": "string", "wajib": true },
            { "nama": "Nama Kegiatan", "nama_db": "nama_kegiatan", "tipe": "text", "wajib": true }
        ];
        await pool.query('UPDATE master_data_config SET kolom = ? WHERE id = 29', [JSON.stringify(kolomKegiatan)]);

        // 30: Master Sub Kegiatan
        const kolomSubKegiatan = [
            { "nama": "Kegiatan ID", "nama_db": "kegiatan_id", "tipe": "number", "wajib": true },
            { "nama": "Kode Sub Kegiatan", "nama_db": "kode_sub_kegiatan", "tipe": "string", "wajib": true },
            { "nama": "Nama Sub Kegiatan", "nama_db": "nama_sub_kegiatan", "tipe": "text", "wajib": true },
            { "nama": "Kinerja", "nama_db": "kinerja", "tipe": "text", "wajib": false },
            { "nama": "Indikator", "nama_db": "indikator", "tipe": "text", "wajib": false },
            { "nama": "Satuan", "nama_db": "satuan", "tipe": "string", "wajib": false }
        ];
        await pool.query('UPDATE master_data_config SET kolom = ? WHERE id = 30', [JSON.stringify(kolomSubKegiatan)]);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
