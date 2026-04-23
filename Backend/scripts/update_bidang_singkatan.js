const pool = require('./src/config/db');

async function run() {
    try {
        console.log('Migrating Bidang & Sub Bidang: adding singkatan...');

        // 1. Rename kode_bidang to singkatan in master_bidang_instansi
        const [bidangCols] = await pool.query('SHOW COLUMNS FROM master_bidang_instansi LIKE "kode_bidang"');
        if (bidangCols.length > 0) {
            await pool.query('ALTER TABLE master_bidang_instansi CHANGE COLUMN kode_bidang singkatan VARCHAR(50)');
            console.log('Renamed kode_bidang to singkatan in master_bidang_instansi');
        } else {
            const [singkatanExists] = await pool.query('SHOW COLUMNS FROM master_bidang_instansi LIKE "singkatan"');
            if (singkatanExists.length === 0) {
                await pool.query('ALTER TABLE master_bidang_instansi ADD COLUMN singkatan VARCHAR(50) AFTER nama_bidang');
                console.log('Added singkatan to master_bidang_instansi');
            }
        }

        // 2. Add singkatan to master_sub_bidang_instansi
        const [subCols] = await pool.query('SHOW COLUMNS FROM master_sub_bidang_instansi LIKE "singkatan"');
        if (subCols.length === 0) {
            await pool.query('ALTER TABLE master_sub_bidang_instansi ADD COLUMN singkatan VARCHAR(50) AFTER nama_sub_bidang');
            console.log('Added singkatan to master_sub_bidang_instansi');
        }

        // 3. Update master_data_config for Bidang (ID 15)
        const bidangKolom = [
            { nama: "ID Instansi", nama_db: "instansi_id", tipe: "number", wajib: true },
            { nama: "Nama Bidang", nama_db: "nama_bidang", tipe: "string", wajib: true },
            { nama: "Singkatan", nama_db: "singkatan", tipe: "string", wajib: false },
            { nama: "Tipe Bidang ID", nama_db: "tipe_bidang_id", tipe: "number", wajib: false }
        ];
        await pool.query('UPDATE master_data_config SET kolom = ? WHERE id = 15', [JSON.stringify(bidangKolom)]);
        console.log('Updated master_data_config for Bidang');

        // 4. Update master_data_config for Sub Bidang (ID 16)
        const subBidangKolom = [
            { nama: "ID Bidang", nama_db: "bidang_instansi_id", tipe: "number", wajib: true },
            { nama: "Nama Sub Bidang", nama_db: "nama_sub_bidang", tipe: "string", wajib: true },
            { nama: "Singkatan", nama_db: "singkatan", tipe: "string", wajib: false },
            { nama: "Tipe Sub Bidang ID", nama_db: "tipe_sub_bidang_id", tipe: "number", wajib: false }
        ];
        await pool.query('UPDATE master_data_config SET kolom = ? WHERE id = 16', [JSON.stringify(subBidangKolom)]);
        console.log('Updated master_data_config for Sub Bidang');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

run();
