const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function makeNullable() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('=== ALTER SCHEMA: Make nomor_surat Nullable ===\n');
        
        await pool.query('ALTER TABLE surat MODIFY COLUMN nomor_surat VARCHAR(100) NULL');
        console.log('✅ Success: nomor_surat column in table "surat" is now nullable.');

        const [cols] = await pool.query('DESCRIBE surat');
        const nomorCol = cols.find(c => c.Field === 'nomor_surat');
        console.log('Current column state:', nomorCol);
    } catch (err) {
        console.error('❌ Error modifying column:', err);
    } finally {
        await pool.end();
    }
}

makeNullable();
