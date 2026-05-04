const pool = require('../../../src/config/db');

async function up() {
    const connection = await pool.getConnection();
    try {
        console.log('Menambahkan kolom isi_surat, metadata, dan employee_id ke tabel surat...');
        
        // Add isi_surat column if missing
        try {
            await connection.query('ALTER TABLE surat ADD COLUMN isi_surat LONGTEXT NULL');
            console.log('OK: Kolom isi_surat berhasil ditambahkan');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('SKIP: Kolom isi_surat sudah ada');
            } else {
                throw err;
            }
        }

        // Add metadata column
        try {
            await connection.query('ALTER TABLE surat ADD COLUMN metadata JSON NULL');
            console.log('OK: Kolom metadata berhasil ditambahkan');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('SKIP: Kolom metadata sudah ada');
            } else {
                throw err;
            }
        }

        // Add employee_id column
        try {
            await connection.query('ALTER TABLE surat ADD COLUMN employee_id INT NULL');
            console.log('OK: Kolom employee_id berhasil ditambahkan');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('SKIP: Kolom employee_id sudah ada');
            } else {
                throw err;
            }
        }

        console.log('Migrasi 002_tambah_metadata_surat selesai.');
        process.exit(0);
    } catch (error) {
        console.error('Error saat menjalankan migrasi:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

up();
