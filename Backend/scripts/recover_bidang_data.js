const mysql = require('mysql2/promise');
require('dotenv').config();

const migrateData = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Migrating existing bidang mappings to master_urusan...');

        // Join old mapping data to find which bidang belongs to which urusan
        const [rows] = await pool.query(`
            SELECT mui.urusan_id, mbp.bidang_instansi_id 
            FROM mapping_bidang_pengampu mbp
            JOIN mapping_urusan_instansi mui ON mbp.mapping_urusan_instansi_id = mui.id
        `);

        console.log(`Found ${rows.length} mappings to recover.`);

        for (const row of rows) {
            await pool.query(
                'UPDATE master_urusan SET bidang_bapperida_id = ? WHERE id = ?',
                [row.bidang_instansi_id, row.urusan_id]
            );
            console.log(`Updated Urusan ID ${row.urusan_id} with Bidang ID ${row.bidang_instansi_id}`);
        }

        console.log('Recovery complete!');
        await pool.end();
    } catch (err) {
        console.error('Error during recovery:', err.message);
    }
};

migrateData();
