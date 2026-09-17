const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function run() {
    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection(dbConfig);

        console.log('Checking current structure of profil_pegawai...');
        const [columns] = await conn.query('SHOW COLUMNS FROM profil_pegawai LIKE "jenis_kelamin"');

        if (columns.length === 0) {
            console.log('Column jenis_kelamin not found. creating it as VARCHAR(20)...');
            await conn.query('ALTER TABLE profil_pegawai ADD COLUMN jenis_kelamin VARCHAR(20) AFTER tanggal_lahir');
        } else {
            console.log('Current type:', columns[0].Type);

            // 1. Change to VARCHAR(20) to allow both 'L'/'P' and full names
            console.log('Altering column to VARCHAR(20)...');
            await conn.query('ALTER TABLE profil_pegawai MODIFY COLUMN jenis_kelamin VARCHAR(20)');

            // 2. Migrate 'L' to 'Laki-laki' and 'P' to 'Perempuan'
            console.log('Migrating data...');
            await conn.query("UPDATE profil_pegawai SET jenis_kelamin = 'Laki-laki' WHERE jenis_kelamin = 'L'");
            await conn.query("UPDATE profil_pegawai SET jenis_kelamin = 'Perempuan' WHERE jenis_kelamin = 'P'");

            console.log('Migration completed.');
        }

        const [finalColumns] = await conn.query('SHOW COLUMNS FROM profil_pegawai LIKE "jenis_kelamin"');
        console.log('Final structure:', finalColumns[0]);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.end();
    }
}

run();
