const pool = require('./src/config/db');

async function alterUsersTable() {
    try {
        console.log('Altering users table...');

        // 1. Add username column if not exists
        try {
            await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id');
            console.log('Added username column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('username column already exists.');
            } else {
                throw e;
            }
        }

        // 2. Migrate existing NIPs to username before dropping the column (so they can still login)
        try {
            await pool.query('UPDATE users SET username = nip WHERE username IS NULL AND nip IS NOT NULL');
            console.log('Migrated nip to username.');
        } catch (e) {
            console.log('Error migrating nip:', e.message);
        }

        // 3. Drop columns
        const columnsToDrop = ['nip', 'nik', 'jenis_pegawai_id', 'jabatan_id'];
        for (const col of columnsToDrop) {
            try {
                // Ignore foreign key drop errors gracefully and just drop the column
                // Before dropping jabatan_id or jenis_pegawai_id we might need to drop foreign keys if they exist

                // For safety we'll try to find the FK constraints first if this fails, but usually simply dropping won't work if FK exists.
                // An easier approach for MySQL is dropping the foreign key first via query.
            } catch (e) { }
        }

        try {
            // First we try to drop constraints. The constraint name is usually table_ibfk_1 etc.
            const [fks] = await pool.query(`
                SELECT CONSTRAINT_NAME, COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME IN ('jenis_pegawai_id', 'jabatan_id')
            `);

            for (let fk of fks) {
                if (fk.CONSTRAINT_NAME !== 'PRIMARY') {
                    console.log(`Dropping FK ${fk.CONSTRAINT_NAME}`);
                    await pool.query(`ALTER TABLE users DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                }
            }

            console.log('Dropping columns...');
            await pool.query('ALTER TABLE users DROP COLUMN nip, DROP COLUMN nik, DROP COLUMN jenis_pegawai_id, DROP COLUMN jabatan_id');
            console.log('Dropped nip, nik, jenis_pegawai_id, jabatan_id columns.');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('Columns likely already dropped.');
            } else {
                console.error("Column drop error:", e);
            }
        }

        console.log('Done altering users table.');
        process.exit(0);

    } catch (err) {
        console.error('Error altering table:', err);
        process.exit(1);
    }
}

alterUsersTable();
