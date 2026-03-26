const mysql = require('mysql2/promise');
require('dotenv').config();

const cleanup = async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Cleaning mapping_bidang_pengampu...');

        // 1. Remove rows with NULL instansi_id (garbage from migration)
        const [delNull] = await connection.query('DELETE FROM mapping_bidang_pengampu WHERE instansi_id IS NULL');
        console.log(`Deleted ${delNull.affectedRows} rows with NULL instansi_id.`);

        // 2. Remove duplicates (Keep the lowest ID for each instansi_id)
        const [delDup] = await connection.query(`
            DELETE t1 FROM mapping_bidang_pengampu t1
            INNER JOIN mapping_bidang_pengampu t2 
            WHERE t1.id > t2.id AND t1.instansi_id = t2.instansi_id
        `);
        console.log(`Deleted ${delDup.affectedRows} duplicate rows.`);

        // 3. Add UNIQUE constraint to prevent future duplicates
        try {
            await connection.query('ALTER TABLE mapping_bidang_pengampu ADD UNIQUE KEY uk_mbp_instansi (instansi_id)');
            console.log('Successfully added UNIQUE constraint on instansi_id.');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('Unique key already exists.');
            } else {
                throw err;
            }
        }

        console.log('Cleanup complete!');
    } catch (err) {
        console.error('Cleanup failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
};

cleanup();
