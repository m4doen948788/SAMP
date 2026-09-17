const mysql = require('mysql2/promise');
require('dotenv').config();

const migrate = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        console.log('--- Starting Migration ---');

        // 1. Add urusan_id column
        console.log('1. Adding urusan_id column to mapping_bidang_pengampu...');
        await connection.query('ALTER TABLE mapping_bidang_pengampu ADD COLUMN urusan_id INT AFTER id');

        // 2. Migrate data
        console.log('2. Migrating data from mapping_urusan_instansi_id to urusan_id...');
        await connection.query(`
            UPDATE mapping_bidang_pengampu mbp
            JOIN mapping_urusan_instansi mui ON mbp.mapping_urusan_instansi_id = mui.id
            SET mbp.urusan_id = mui.urusan_id
        `);

        // 3. Remove mapping_urusan_instansi_id column
        console.log('3. Removing mapping_urusan_instansi_id column...');
        await connection.query('ALTER TABLE mapping_bidang_pengampu DROP FOREIGN KEY mapping_bidang_pengampu_ibfk_1').catch(e => console.log('   (No foreign key mapping_bidang_pengampu_ibfk_1 found, skipping drop)'));
        await connection.query('ALTER TABLE mapping_bidang_pengampu DROP COLUMN mapping_urusan_instansi_id');

        // 4. Add constraints
        console.log('4. Adding foreign key and unique constraints...');
        await connection.query('ALTER TABLE mapping_bidang_pengampu ADD CONSTRAINT fk_mbp_urusan FOREIGN KEY (urusan_id) REFERENCES master_urusan(id) ON DELETE CASCADE');
        await connection.query('ALTER TABLE mapping_bidang_pengampu ADD UNIQUE INDEX unq_urusan_bidang (urusan_id, bidang_instansi_id)');

        await connection.commit();
        console.log('--- Migration Completed Successfully ---');
    } catch (err) {
        await connection.rollback();
        console.error('--- Migration Failed ---');
        console.error(err.message);
    } finally {
        connection.release();
        await pool.end();
    }
};

migrate();
