const pool = require('./config/db');

async function updateConfig() {
    const connection = await pool.getConnection();
    try {
        console.log('Updating master_data_config for master_urusan...');
        await connection.query("UPDATE master_data_config SET nama_tabel = 'master_bidang_urusan', label = 'Master Bidang Urusan' WHERE nama_tabel = 'master_urusan'");
        console.log('Successfully updated master_data_config.');
    } catch (err) {
        console.error('Error updating config:', err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

updateConfig();
