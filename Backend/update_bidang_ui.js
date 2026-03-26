const pool = require('./src/config/db');

async function updateConfig() {
    try {
        const [rows] = await pool.query('SELECT kolom FROM master_data_config WHERE nama_tabel = "master_bidang_urusan"');
        if (rows.length === 0) {
            console.error('Config not found!');
            process.exit(1);
        }

        let cols = rows[0].kolom;
        if (typeof cols === 'string') cols = JSON.parse(cols);

        // Check if parent_id is already there
        if (!cols.find(c => c.nama_db === 'parent_id')) {
            cols.unshift({
                nama: "Urusan Induk",
                nama_db: "parent_id",
                tipe: "select",
                source_table: "master_urusan",
                display_column: "urusan",
                wajib: true
            });

            await pool.query('UPDATE master_data_config SET kolom = ? WHERE nama_tabel = "master_bidang_urusan"', [JSON.stringify(cols)]);
            console.log('Successfully added Urusan Induk (parent_id) selector to master_bidang_urusan UI config.');
        } else {
            console.log('parent_id already exists in config.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateConfig();
