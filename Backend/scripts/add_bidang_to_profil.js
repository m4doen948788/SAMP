const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // 1. Add bidang_id column to profil_pegawai
        try {
            await p.query('ALTER TABLE profil_pegawai ADD COLUMN bidang_id INT AFTER jabatan_id');
            console.log('✅ Added bidang_id column to profil_pegawai');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭️  bidang_id already exists');
            else throw e;
        }

        // 2. Update master_data_config for profil_pegawai
        const [config] = await p.query('SELECT kolom FROM master_data_config WHERE nama_tabel = ?', ['profil_pegawai']);
        if (config.length > 0) {
            const kolom = JSON.parse(config[0].kolom);
            const hasBidang = kolom.some(k => k.nama_db === 'bidang_id');
            if (!hasBidang) {
                // Insert after jabatan_id
                const jabatanIdx = kolom.findIndex(k => k.nama_db === 'jabatan_id');
                const newCol = { nama: "Bidang ID", nama_db: "bidang_id", tipe: "number", wajib: false };
                if (jabatanIdx >= 0) {
                    kolom.splice(jabatanIdx + 1, 0, newCol);
                } else {
                    kolom.push(newCol);
                }
                await p.query('UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?', [JSON.stringify(kolom), 'profil_pegawai']);
                console.log('✅ Updated master_data_config for profil_pegawai');
            } else {
                console.log('⏭️  bidang_id already in config');
            }
        }

        console.log('\n✅ Done!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await p.end();
    }
})();
