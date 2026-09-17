const mysql = require('mysql2/promise');
require('dotenv').config();

async function reviseSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('=== REVISI SCHEMA: Users & Profil Pegawai ===\n');

        // ============================================================
        // STEP 1: Tambah kolom baru ke profil_pegawai
        // ============================================================
        console.log('STEP 1: Menambah kolom baru ke profil_pegawai...');

        const newColumns = [
            { name: 'nama_lengkap', def: 'VARCHAR(255) AFTER id' },
            { name: 'email', def: 'VARCHAR(255) AFTER nama_lengkap' },
            { name: 'no_hp', def: 'VARCHAR(20) AFTER email' },
            { name: 'tipe_user_id', def: 'INT AFTER no_hp' },
            { name: 'instansi_id', def: 'INT AFTER tipe_user_id' },
            { name: 'jabatan_id', def: 'INT AFTER instansi_id' },
            { name: 'sub_bidang_id', def: 'INT AFTER jabatan_id' },
            { name: 'foto_profil', def: 'TEXT AFTER sub_bidang_id' },
            { name: 'is_active', def: 'TINYINT DEFAULT 1 AFTER foto_profil' },
            { name: 'last_login_at', def: 'DATETIME AFTER is_active' },
            { name: 'tema', def: 'VARCHAR(50) AFTER last_login_at' },
            { name: 'tema_custom_colors', def: 'TEXT AFTER tema' },
        ];

        for (const col of newColumns) {
            try {
                await pool.query(`ALTER TABLE profil_pegawai ADD COLUMN ${col.name} ${col.def}`);
                console.log(`  ✅ Added column: ${col.name}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⏭️  Column ${col.name} already exists, skipping.`);
                } else {
                    throw e;
                }
            }
        }

        // ============================================================
        // STEP 2: Migrasi data dari users ke profil_pegawai
        // ============================================================
        console.log('\nSTEP 2: Migrasi data dari users ke profil_pegawai...');

        // Get all users
        const [users] = await pool.query('SELECT * FROM users');
        console.log(`  Found ${users.length} users to migrate.`);

        for (const user of users) {
            // Check if profil_pegawai already exists for this user
            const [existing] = await pool.query('SELECT id FROM profil_pegawai WHERE user_id = ?', [user.id]);

            if (existing.length > 0) {
                // Update existing profil_pegawai record
                await pool.query(`
                    UPDATE profil_pegawai SET
                        nama_lengkap = ?,
                        email = ?,
                        no_hp = ?,
                        tipe_user_id = ?,
                        instansi_id = ?,
                        jabatan_id = ?,
                        sub_bidang_id = ?,
                        foto_profil = ?,
                        is_active = ?,
                        last_login_at = ?,
                        tema = ?,
                        tema_custom_colors = ?
                    WHERE user_id = ?
                `, [
                    user.nama_lengkap,
                    user.email,
                    user.no_hp,
                    user.tipe_user_id,
                    user.instansi_id,
                    user.jabatan_id || null,
                    user.sub_bidang_id || null,
                    user.foto_profil || null,
                    user.is_active !== undefined ? user.is_active : 1,
                    user.last_login_at || null,
                    user.tema || null,
                    user.tema_custom_colors || null,
                    user.id
                ]);
                console.log(`  ✅ Updated profil for user #${user.id} (${user.nama_lengkap || user.username})`);
            } else {
                // Create new profil_pegawai record
                await pool.query(`
                    INSERT INTO profil_pegawai (
                        user_id, nama_lengkap, email, no_hp, tipe_user_id,
                        instansi_id, jabatan_id, sub_bidang_id, foto_profil,
                        is_active, last_login_at, tema, tema_custom_colors
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.id,
                    user.nama_lengkap,
                    user.email,
                    user.no_hp,
                    user.tipe_user_id,
                    user.instansi_id,
                    user.jabatan_id || null,
                    user.sub_bidang_id || null,
                    user.foto_profil || null,
                    user.is_active !== undefined ? user.is_active : 1,
                    user.last_login_at || null,
                    user.tema || null,
                    user.tema_custom_colors || null
                ]);
                console.log(`  ✅ Created profil for user #${user.id} (${user.nama_lengkap || user.username})`);
            }
        }

        // ============================================================
        // STEP 3: Add profil_pegawai_id FK to users table
        // ============================================================
        console.log('\nSTEP 3: Menambah kolom profil_pegawai_id di users...');

        try {
            await pool.query('ALTER TABLE users ADD COLUMN profil_pegawai_id INT AFTER id');
            console.log('  ✅ Added profil_pegawai_id column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('  ⏭️  profil_pegawai_id column already exists.');
            } else {
                throw e;
            }
        }

        // Set profil_pegawai_id from the matching profil_pegawai records
        await pool.query(`
            UPDATE users u
            INNER JOIN profil_pegawai pp ON pp.user_id = u.id
            SET u.profil_pegawai_id = pp.id
        `);
        console.log('  ✅ Linked users to profil_pegawai records.');

        // ============================================================
        // STEP 4: Drop kolom lama dari users
        // ============================================================
        console.log('\nSTEP 4: Menghapus kolom lama dari users...');

        // First, drop any foreign key constraints on columns we want to drop
        try {
            const [fks] = await pool.query(`
                SELECT CONSTRAINT_NAME, COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            for (const fk of fks) {
                try {
                    await pool.query(`ALTER TABLE users DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                    console.log(`  ✅ Dropped FK: ${fk.CONSTRAINT_NAME}`);
                } catch (e) {
                    console.log(`  ⚠️  Could not drop FK ${fk.CONSTRAINT_NAME}: ${e.message}`);
                }
            }
        } catch (e) {
            console.log('  ⚠️  Error checking FKs:', e.message);
        }

        // Drop indexes on columns we want to remove (e.g. UNIQUE on email)
        try {
            const [indexes] = await pool.query('SHOW INDEX FROM users');
            const indexNames = new Set();
            for (const idx of indexes) {
                if (['email', 'nama_lengkap', 'no_hp', 'tipe_user_id', 'instansi_id', 'jabatan_id', 'sub_bidang_id'].includes(idx.Column_name)) {
                    indexNames.add(idx.Key_name);
                }
            }
            for (const idxName of indexNames) {
                if (idxName !== 'PRIMARY') {
                    try {
                        await pool.query(`ALTER TABLE users DROP INDEX \`${idxName}\``);
                        console.log(`  ✅ Dropped index: ${idxName}`);
                    } catch (e) {
                        console.log(`  ⚠️  Could not drop index ${idxName}: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            console.log('  ⚠️  Error checking indexes:', e.message);
        }

        // Drop columns one by one for safety
        const columnsToDrop = [
            'nama_lengkap', 'email', 'no_hp', 'tipe_user_id',
            'instansi_id', 'jabatan_id', 'sub_bidang_id',
            'foto_profil', 'is_active', 'last_login_at',
            'tema', 'tema_custom_colors'
        ];

        for (const col of columnsToDrop) {
            try {
                await pool.query(`ALTER TABLE users DROP COLUMN ${col}`);
                console.log(`  ✅ Dropped column: ${col}`);
            } catch (e) {
                if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`  ⏭️  Column ${col} does not exist, already dropped.`);
                } else {
                    console.log(`  ⚠️  Error dropping ${col}: ${e.message}`);
                }
            }
        }

        // Also drop user_id from profil_pegawai (no longer needed)
        console.log('\nSTEP 5: Menghapus kolom user_id dari profil_pegawai...');
        try {
            // Drop any FK/index on user_id first
            const [ppIndexes] = await pool.query('SHOW INDEX FROM profil_pegawai');
            for (const idx of ppIndexes) {
                if (idx.Column_name === 'user_id' && idx.Key_name !== 'PRIMARY') {
                    try {
                        await pool.query(`ALTER TABLE profil_pegawai DROP INDEX \`${idx.Key_name}\``);
                        console.log(`  ✅ Dropped index: ${idx.Key_name}`);
                    } catch (e) { }
                }
            }
            await pool.query('ALTER TABLE profil_pegawai DROP COLUMN user_id');
            console.log('  ✅ Dropped user_id from profil_pegawai.');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('  ⏭️  user_id already dropped from profil_pegawai.');
            } else {
                console.log(`  ⚠️  Error: ${e.message}`);
            }
        }

        // ============================================================
        // STEP 6: Verifikasi struktur tabel akhir
        // ============================================================
        console.log('\n=== VERIFIKASI STRUKTUR AKHIR ===\n');

        const [usersCols] = await pool.query('SHOW COLUMNS FROM users');
        console.log('Tabel USERS:');
        for (const col of usersCols) {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? `[${col.Key}]` : ''}`);
        }

        const [profilCols] = await pool.query('SHOW COLUMNS FROM profil_pegawai');
        console.log('\nTabel PROFIL_PEGAWAI:');
        for (const col of profilCols) {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? `[${col.Key}]` : ''}`);
        }

        console.log('\n✅ MIGRASI SELESAI!');

    } catch (err) {
        console.error('\n❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

reviseSchema();
