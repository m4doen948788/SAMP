const pool = require('../src/config/db');

async function run() {
    try {
        console.log('--- Checking & adding missing columns to master_instansi_daerah ---');
        
        const [columns] = await pool.query('SHOW COLUMNS FROM master_instansi_daerah');
        const existingColumns = columns.map(c => c.Field.toLowerCase());
        
        const columnsToAdd = [
            { name: 'tupoksi', definition: 'TEXT NULL' },
            { name: 'alamat', definition: 'TEXT NULL' },
            { name: 'jalan_no', definition: 'VARCHAR(255) NULL' },
            { name: 'kecamatan', definition: 'VARCHAR(100) NULL' },
            { name: 'kelurahan', definition: 'VARCHAR(100) NULL' },
            { name: 'kelurahan_tipe', definition: 'VARCHAR(50) NULL' },
            { name: 'kabupaten', definition: 'VARCHAR(100) NULL' },
            { name: 'provinsi', definition: 'VARCHAR(100) NULL' },
            { name: 'provinsi_id', definition: 'INT NULL' },
            { name: 'kota_kabupaten_id', definition: 'INT NULL' },
            { name: 'kecamatan_id', definition: 'INT NULL' },
            { name: 'kelurahan_id', definition: 'INT NULL' },
            { name: 'kode_pos', definition: 'VARCHAR(10) NULL' },
            { name: 'alamat_web', definition: 'VARCHAR(255) NULL' },
            { name: 'telepon_kop', definition: 'VARCHAR(50) NULL' },
            { name: 'faks_kop', definition: 'VARCHAR(50) NULL' },
            { name: 'email_kop', definition: 'VARCHAR(255) NULL' },
            { name: 'website_kop', definition: 'VARCHAR(255) NULL' },
            { name: 'nama_instansi_kop', definition: 'VARCHAR(255) NULL' },
            { name: 'logo_kop_path', definition: 'VARCHAR(255) NULL' }
        ];
        
        for (const col of columnsToAdd) {
            if (!existingColumns.includes(col.name.toLowerCase())) {
                console.log(`Adding column: ${col.name}...`);
                await pool.query(`ALTER TABLE master_instansi_daerah ADD COLUMN ${col.name} ${col.definition}`);
                console.log(`Successfully added column: ${col.name}`);
            } else {
                console.log(`Column already exists: ${col.name}`);
            }
        }
        
        console.log('--- Migration completed successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
