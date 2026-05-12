/**
 * Migration: Add missing columns to master_instansi_daerah
 */

async function up(connection) {
    console.log('Running migration: 009_add_missing_columns_to_instansi');
    
    const columns = [
        { name: 'tupoksi', type: 'TEXT NULL' },
        { name: 'alamat', type: 'TEXT NULL' },
        { name: 'jalan_no', type: 'VARCHAR(255) NULL' },
        { name: 'kecamatan', type: 'VARCHAR(100) NULL' },
        { name: 'kelurahan', type: 'VARCHAR(100) NULL' },
        { name: 'kelurahan_tipe', type: 'VARCHAR(50) NULL' },
        { name: 'kabupaten', type: 'VARCHAR(100) NULL' },
        { name: 'provinsi', type: 'VARCHAR(100) NULL' },
        { name: 'provinsi_id', type: 'INT NULL' },
        { name: 'kota_kabupaten_id', type: 'INT NULL' },
        { name: 'kecamatan_id', type: 'INT NULL' },
        { name: 'kelurahan_id', type: 'INT NULL' },
        { name: 'kode_pos', type: 'VARCHAR(10) NULL' },
        { name: 'alamat_web', type: 'VARCHAR(255) NULL' },
        { name: 'telepon_kop', type: 'VARCHAR(50) NULL' },
        { name: 'faks_kop', type: 'VARCHAR(50) NULL' },
        { name: 'email_kop', type: 'VARCHAR(255) NULL' },
        { name: 'website_kop', type: 'VARCHAR(255) NULL' },
        { name: 'nama_instansi_kop', type: 'VARCHAR(255) NULL' },
        { name: 'logo_kop_path', type: 'VARCHAR(255) NULL' }
    ];

    for (const col of columns) {
        try {
            const [check] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'master_instansi_daerah' 
                AND COLUMN_NAME = ?
            `, [col.name]);

            if (check[0].count === 0) {
                console.log(`Adding column ${col.name} to master_instansi_daerah...`);
                await connection.query(`ALTER TABLE master_instansi_daerah ADD COLUMN ${col.name} ${col.type}`);
            }
        } catch (err) {
            console.error(`Error adding column ${col.name}:`, err.message);
        }
    }
}

async function down(connection) {
}

// Self-execution block
if (require.main === module) {
    const db = require('../../../src/config/db');
    up(db).then(() => {
        console.log('Migration 009 completed successfully.');
        process.exit(0);
    }).catch(err => {
        console.error('Migration 009 failed:', err);
        process.exit(1);
    });
}

module.exports = { up, down };
