const pool = require('./config/db');

async function renameTable() {
    const connection = await pool.getConnection();
    try {
        console.log('Renaming table master_urusan to master_bidang_urusan...');
        await connection.query('RENAME TABLE master_urusan TO master_bidang_urusan');
        console.log('Successfully renamed table.');
    } catch (err) {
        console.error('Error renaming table:', err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

renameTable();
