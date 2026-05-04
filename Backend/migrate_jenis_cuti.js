const db = require('./src/config/db');

async function migrate() {
    try {
        console.log('Creating table master_jenis_cuti...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS master_jenis_cuti (
                id INT AUTO_INCREMENT PRIMARY KEY,
                jenis_cuti VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at DATETIME NULL
            )
        `);

        console.log('Inserting default values...');
        const types = ['Cuti Tahunan', 'Cuti Besar', 'Cuti Sakit', 'Cuti Bersalin', 'Cuti Karena Alasan Penting'];
        
        for (const type of types) {
            const [existing] = await db.query('SELECT id FROM master_jenis_cuti WHERE jenis_cuti = ?', [type]);
            if (existing.length === 0) {
                await db.query('INSERT INTO master_jenis_cuti (jenis_cuti) VALUES (?)', [type]);
                console.log(`Inserted: ${type}`);
            } else {
                console.log(`Already exists: ${type}`);
            }
        }

        console.log('Registering to master_data_config...');
        const tableName = 'master_jenis_cuti';
        const label = 'Jenis Cuti';
        const kolom = [
            { nama: 'Jenis Cuti', tipe: 'text', wajib: true, list: true, nama_db: 'jenis_cuti' }
        ];

        const [configExist] = await db.query('SELECT id FROM master_data_config WHERE nama_tabel = ?', [tableName]);
        if (configExist.length === 0) {
            await db.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom) VALUES (?, ?, ?)',
                [tableName, label, JSON.stringify(kolom)]
            );
            console.log('Registered in master_data_config.');
        } else {
            console.log('Already registered in master_data_config.');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
