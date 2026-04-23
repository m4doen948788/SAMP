const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSuratSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('=== FIX SCHEMA: Tabel Surat ===\n');

        // 1. Tambah kolom ke tabel surat
        const columns = [
            { name: 'jenis_surat_id', def: 'INT AFTER nomor_surat' },
            { name: 'tanggal_acara', def: 'DATE AFTER tanggal_surat' },
            { name: 'tujuan_surat', def: 'VARCHAR(255) AFTER asal_surat' },
            { name: 'instansi_id', def: 'INT AFTER dokumen_id' },
            { name: 'bidang_id', def: 'INT AFTER instansi_id' },
            { name: 'created_by', def: 'INT AFTER bidang_id' }
        ];

        for (const col of columns) {
            try {
                await pool.query(`ALTER TABLE surat ADD COLUMN ${col.name} ${col.def}`);
                console.log(`  ✅ Added column: ${col.name}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⏭️  Column ${col.name} already exists.`);
                } else {
                    console.log(`  ❌ Error adding ${col.name}: ${e.message}`);
                }
            }
        }

        // 2. Buat tabel surat jika belum ada (safety check)
        // (Berdasarkan error 'Unknown column', tabelnya pasti ada)

        // 3. Verifikasi struktur akhir
        const [rows] = await pool.query('SHOW COLUMNS FROM surat');
        console.log('\nStruktur tabel surat sekarang:');
        rows.forEach(row => console.log(`  - ${row.Field} (${row.Type})`));

        console.log('\n✅ PERBAIKAN SELESAI!');

    } catch (err) {
        console.error('\n❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

fixSuratSchema();
