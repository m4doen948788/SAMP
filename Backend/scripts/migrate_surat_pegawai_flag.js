const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('--- Migrasi Tambah Kolom is_pegawai_required ---');

        try {
            await pool.query(`ALTER TABLE surat_templates ADD COLUMN is_pegawai_required BOOLEAN DEFAULT FALSE AFTER isi_template`);
            console.log('✅ Kolom is_pegawai_required berhasil ditambahkan.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Kolom is_pegawai_required sudah ada.');
            } else {
                throw e;
            }
        }

        // Set true for Surat Cuti by default
        await pool.query('UPDATE surat_templates SET is_pegawai_required = TRUE WHERE nama_jenis_surat = "Surat Cuti"');

        console.log('✅ Migrasi Berhasil!');
    } catch (err) {
        console.error('❌ Migrasi Gagal:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
