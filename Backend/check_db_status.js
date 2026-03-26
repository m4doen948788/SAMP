const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCounts() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [prov] = await pool.query('SELECT COUNT(*) as cnt FROM master_provinsi');
        const [kota] = await pool.query('SELECT COUNT(*) as cnt FROM master_kota_kabupaten');
        const [kec] = await pool.query('SELECT COUNT(*) as cnt FROM master_kecamatan');
        const [kel] = await pool.query('SELECT COUNT(*) as cnt FROM master_kelurahan');

        console.log(`Provinsi: ${prov[0].cnt}`);
        console.log(`Kota/Kabupaten: ${kota[0].cnt}`);
        console.log(`Kecamatan: ${kec[0].cnt}`);
        console.log(`Kelurahan/Desa: ${kel[0].cnt}`);

        const [procKec] = await pool.query('SELECT COUNT(DISTINCT kecamatan_id) as cnt FROM master_kelurahan');
        console.log(`Kecamatan Processed: ${procKec[0].cnt} out of ${kec[0].cnt}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkCounts();
