const pool = require('./src/config/db');

async function dropAllTables() {
    try {
        console.log('\n⚠️  MEMULAI PROSES DROP SEMUA TABEL...');
        
        // 1. Ambil semua nama tabel di database aktif
        const [tables] = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);

        if (tables.length === 0) {
            console.log('ℹ️  Database sudah kosong, tidak ada tabel untuk dihapus.');
            return;
        }

        console.log(` ditemukan ${tables.length} tabel.`);

        // 2. Matikan Foreign Key Check agar bisa menghapus tabel dengan relasi
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            // Kita juga perlu hapus VIEW jika ada
            const [isView] = await pool.query(`
                SELECT table_type FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = ?
            `, [tableName]);
            
            if (isView[0] && isView[0].TABLE_TYPE === 'VIEW') {
                await pool.query(`DROP VIEW IF EXISTS \`${tableName}\``);
            } else {
                await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
            }
            console.log(` ✅ Dropped: ${tableName}`);
        }

        // 3. Hidupkan kembali
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('\n✨ SELURUH TABEL BERHASIL DIHAPUS!');
    } catch (err) {
        console.error('\n❌ GAGAL menghapus tabel:', err.message);
    } finally {
        process.exit(0);
    }
}

dropAllTables();
