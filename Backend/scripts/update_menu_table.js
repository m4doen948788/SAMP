const pool = require('./config/db');

async function updateMenus() {
    const connection = await pool.getConnection();
    try {
        console.log('Updating kelola_menu action_page from master-urusan to master-bidang-urusan...');
        await connection.query("UPDATE kelola_menu SET action_page = 'master-bidang-urusan' WHERE action_page = 'master-urusan'");
        console.log('Successfully updated kelola_menu table.');
        
        console.log('Renaming Master Urusan menu label...');
        await connection.query("UPDATE kelola_menu SET nama_menu = 'Master Bidang Urusan' WHERE nama_menu = 'Master Urusan'");
        console.log('Successfully updated menu label.');
    } catch (err) {
        console.error('Error updating menus:', err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

updateMenus();
