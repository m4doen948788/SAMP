const mysql = require('mysql2/promise');
require('dotenv').config();

const migrate = async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Starting migration: mapping_bidang_pengampu (urusan -> instansi)...');

        // 1. Add instansi_id column
        await connection.query('ALTER TABLE mapping_bidang_pengampu ADD COLUMN instansi_id INT AFTER id');
        console.log('Added instansi_id column.');

        // 2. Try to migrate data from mapping_urusan_instansi if possible 
        // (This is heuristic: picking the first instansi found for that urusan)
        await connection.query(`
            UPDATE mapping_bidang_pengampu mbp
            SET instansi_id = (
                SELECT instansi_id 
                FROM mapping_urusan_instansi mui 
                WHERE mui.urusan_id = mbp.urusan_id 
                LIMIT 1
            )
            WHERE instansi_id IS NULL
        `);
        console.log('Heuristic data migration completed.');

        // 3. Drop urusan_id
        await connection.query('ALTER TABLE mapping_bidang_pengampu DROP COLUMN urusan_id');
        console.log('Dropped urusan_id column.');

        // 4. Add constraints
        await connection.query('ALTER TABLE mapping_bidang_pengampu ADD CONSTRAINT fk_mbp_instansi FOREIGN KEY (instansi_id) REFERENCES master_instansi_daerah(id) ON DELETE CASCADE');
        await connection.query('ALTER TABLE mapping_bidang_pengampu ADD UNIQUE KEY uk_mbp_instansi (instansi_id)');
        console.log('Constraints added.');

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
};

migrate();
