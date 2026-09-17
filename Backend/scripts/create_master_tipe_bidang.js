const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_tipe_bidang (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_tipe VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at DATETIME NULL
            )
        `);
        console.log('Created master_tipe_bidang');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_tipe_sub_bidang (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_tipe VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at DATETIME NULL
            )
        `);
        console.log('Created master_tipe_sub_bidang');

        // 2. Register in master_data_config
        const checkConfig = async (tableName) => {
            const [rows] = await pool.query('SELECT id FROM master_data_config WHERE nama_tabel = ?', [tableName]);
            return rows.length > 0;
        };

        const configBidang = [
            { nama: 'Nama Tipe', nama_db: 'nama_tipe', tipe: 'string', wajib: true }
        ];

        if (!(await checkConfig('master_tipe_bidang'))) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom) VALUES (?, ?, ?)',
                ['master_tipe_bidang', 'Tipe Bidang', JSON.stringify(configBidang)]
            );
            console.log('Registered master_tipe_bidang to master_data_config');
        }

        if (!(await checkConfig('master_tipe_sub_bidang'))) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom) VALUES (?, ?, ?)',
                ['master_tipe_sub_bidang', 'Tipe Sub Bidang', JSON.stringify(configBidang)]
            );
            console.log('Registered master_tipe_sub_bidang to master_data_config');
        }

        // 3. Insert default data
        const insertDefault = async (table, names) => {
            for (const name of names) {
                const [rows] = await pool.query(`SELECT id FROM ${table} WHERE nama_tipe = ?`, [name]);
                if (rows.length === 0) {
                    await pool.query(`INSERT INTO ${table} (nama_tipe) VALUES (?)`, [name]);
                }
            }
        };

        await insertDefault('master_tipe_bidang', ['Bidang', 'Bagian']);
        await insertDefault('master_tipe_sub_bidang', ['Sub Bidang', 'Sub Bagian']);
        console.log('Inserted default data');

        // 4. Alter existing tables
        const alterTable = async (table, colToDrop, colToAdd, isSub) => {
            const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
            const hasDrop = columns.some(c => c.Field === colToDrop);
            const hasAdd = columns.some(c => c.Field === colToAdd);

            if (hasDrop) {
                await pool.query(`ALTER TABLE ${table} DROP COLUMN ${colToDrop}`);
                console.log(`Dropped ${colToDrop} from ${table}`);
            }
            if (!hasAdd) {
                const refTable = isSub ? 'master_tipe_sub_bidang' : 'master_tipe_bidang';
                const [defaultIdQuery] = await pool.query(`SELECT id FROM ${refTable} LIMIT 1`);
                const defaultId = defaultIdQuery.length > 0 ? defaultIdQuery[0].id : 1;
                await pool.query(`ALTER TABLE ${table} ADD COLUMN ${colToAdd} INT DEFAULT ${defaultId}`);
                console.log(`Added ${colToAdd} to ${table}`);
            }
        };

        await alterTable('master_bidang_instansi', 'tipe', 'tipe_bidang_id', false);
        await alterTable('master_sub_bidang_instansi', 'tipe', 'tipe_sub_bidang_id', true);

        console.log('Migration successful!');
        process.exit(0);
    } catch (e) {
        require('fs').writeFileSync('err.txt', e.stack || e.toString());
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
