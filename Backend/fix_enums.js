const db = require('./src/config/db');

async function run() {
    try {
        console.log('Updating enums...');
        await db.query("ALTER TABLE surat MODIFY COLUMN tipe_surat ENUM('masuk','keluar','internal') NOT NULL");
        console.log('tipe_surat updated.');
        await db.query("ALTER TABLE surat MODIFY COLUMN approval_status ENUM('DRAFT','WAITING_APPROVAL','APPROVED','REJECTED','RETURNED') DEFAULT 'DRAFT'");
        console.log('approval_status updated.');
        await db.query("UPDATE surat SET tipe_surat = 'internal' WHERE (tipe_surat = '' OR tipe_surat IS NULL) AND approval_status = 'WAITING_APPROVAL'");
        console.log('Existing records fixed.');
        console.log('Enum updated successfully');
    } catch(err) {
        console.error('Update failed:', err);
    } finally {
        process.exit(0);
    }
}

run();
