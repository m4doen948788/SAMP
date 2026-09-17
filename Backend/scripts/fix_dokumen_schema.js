const pool = require('./src/config/db');

const migrate = async () => {
    try {
        console.log('Mulai migrasi skema dokumen...');

        // 1. Ubah tipe_dokumen ENUM ke VARCHAR agar bisa menerima kategori baru
        await pool.query(`
            ALTER TABLE kegiatan_manajemen_dokumen 
            MODIFY COLUMN tipe_dokumen VARCHAR(100) NOT NULL;
        `);
        console.log('Berhasil mengubah tipe_dokumen ke VARCHAR(100).');

        // 2. Tambah kolom dokumen_id jika belum ada (id dari master_dokumen)
        const [columns] = await pool.query('SHOW COLUMNS FROM kegiatan_manajemen_dokumen LIKE "dokumen_id"');
        if (columns.length === 0) {
            await pool.query(`
                ALTER TABLE kegiatan_manajemen_dokumen 
                ADD COLUMN dokumen_id INT DEFAULT NULL AFTER tipe_dokumen;
            `);
            console.log('Berhasil menambahkan kolom dokumen_id.');
        } else {
            console.log('Kolom dokumen_id sudah ada.');
        }

        console.log('Migrasi selesai!');
        process.exit(0);
    } catch (err) {
        console.error('Migrasi gagal:', err.message);
        process.exit(1);
    }
};

migrate();
