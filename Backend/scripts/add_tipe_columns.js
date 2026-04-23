const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTipeColumns() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ppm_simpeg'
        });

        console.log('Connected to database.');

        // Add tipe to master_bidang_instansi
        try {
            await connection.query("ALTER TABLE master_bidang_instansi ADD COLUMN tipe ENUM('bidang', 'bagian') NOT NULL DEFAULT 'bidang' AFTER nama_bidang");
            console.log('Added tipe column to master_bidang_instansi');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('tipe column already exists in master_bidang_instansi');
            } else {
                throw err;
            }
        }

        // Add tipe to master_sub_bidang_instansi
        try {
            await connection.query("ALTER TABLE master_sub_bidang_instansi ADD COLUMN tipe ENUM('sub_bidang', 'sub_bagian') NOT NULL DEFAULT 'sub_bidang' AFTER nama_sub_bidang");
            console.log('Added tipe column to master_sub_bidang_instansi');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('tipe column already exists in master_sub_bidang_instansi');
            } else {
                throw err;
            }
        }

        await connection.end();
        console.log('Done.');
    } catch (err) {
        console.error('Error:', err);
    }
}

addTipeColumns();
