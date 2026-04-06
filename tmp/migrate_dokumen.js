const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Backend/.env') });

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding column jenis_dokumen_id to master_dokumen...');
        await pool.query("ALTER TABLE master_dokumen ADD COLUMN jenis_dokumen_id INT NULL AFTER id").catch(err => {
            if (err.code === 'ER_DUP_COLUMN') console.log('Column already exists');
            else throw err;
        });

        console.log('Updating master_data_config for master_dokumen...');
        const [configRows] = await pool.query("SELECT * FROM master_data_config WHERE nama_tabel = 'master_dokumen'");
        
        if (configRows.length > 0) {
            const config = configRows[0];
            let kolom = JSON.parse(config.kolom);
            
            // Check if already exists
            if (!kolom.find(k => k.nama_db === 'jenis_dokumen_id')) {
                // Add to the START of the array (since user wanted it on the left)
                kolom.unshift({
                    nama: "Jenis Dokumen",
                    nama_db: "jenis_dokumen_id",
                    tipe: "relation",
                    relation_table: "master_jenis_dokumen",
                    relation_label: "nama",
                    wajib: false
                });
                
                await pool.query("UPDATE master_data_config SET kolom = ? WHERE id = ?", [JSON.stringify(kolom), config.id]);
                console.log('Config updated successfully.');
            } else {
                console.log('Config already contains jenis_dokumen_id.');
            }
        } else {
            console.log('Master data config for master_dokumen not found.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
