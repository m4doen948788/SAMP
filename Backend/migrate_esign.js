const pool = require('./src/config/db');

async function migrateESign() {
    try {
        console.log('--- Migrating E-Signature Workflow ---');

        // 1. Create surat_approvals
        await pool.query(`
            CREATE TABLE IF NOT EXISTS surat_approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                surat_id INT NOT NULL,
                approver_id INT NOT NULL,
                role ENUM('pengusul', 'ketua_tim', 'kabid', 'kaban') NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                reason TEXT DEFAULT NULL,
                urutan INT NOT NULL,
                signed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table surat_approvals created.');

        // 2. Add approval_status to surat table if it doesn't exist
        const [suratCols] = await pool.query("SHOW COLUMNS FROM surat LIKE 'approval_status'");
        if (suratCols.length === 0) {
            await pool.query("ALTER TABLE surat ADD COLUMN approval_status ENUM('DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT'");
            console.log('✅ Column approval_status added to surat table.');
        }

        // 3. Add signature columns to profil_pegawai (since user info is usually there)
        const [pegawaiCols1] = await pool.query("SHOW COLUMNS FROM profil_pegawai LIKE 'signature_image'");
        if (pegawaiCols1.length === 0) {
            await pool.query("ALTER TABLE profil_pegawai ADD COLUMN signature_image VARCHAR(255) NULL");
            console.log('✅ Column signature_image added to profil_pegawai.');
        }

        const [pegawaiCols2] = await pool.query("SHOW COLUMNS FROM profil_pegawai LIKE 'paraf_image'");
        if (pegawaiCols2.length === 0) {
            await pool.query("ALTER TABLE profil_pegawai ADD COLUMN paraf_image VARCHAR(255) NULL");
            console.log('✅ Column paraf_image added to profil_pegawai.');
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        process.exit(0);
    }
}

migrateESign();
