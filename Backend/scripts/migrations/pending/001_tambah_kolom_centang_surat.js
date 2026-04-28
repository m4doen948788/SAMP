const pool = require('../../../src/config/db');

async function migrate() {
    try {
        console.log('--- Menambahkan Kolom Centang Dinamis ---');
        await pool.query('ALTER TABLE surat_templates ADD COLUMN has_tujuan BOOLEAN DEFAULT FALSE, ADD COLUMN has_pembuka BOOLEAN DEFAULT FALSE, ADD COLUMN has_identitas_pegawai BOOLEAN DEFAULT FALSE, ADD COLUMN has_detail_cuti BOOLEAN DEFAULT FALSE, ADD COLUMN has_penutup BOOLEAN DEFAULT FALSE');
        console.log('✅ 5 Kolom baru berhasil ditambahkan.');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Kolom sudah ada sebelumnya, mengabaikan migrasi ini.');
        } else {
            throw e;
        }
    }
}

migrate();
