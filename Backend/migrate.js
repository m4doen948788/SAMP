const { execSync } = require('child_process');
const path = require('path');

/**
 * Script untuk menjalankan seluruh migrasi database secara berurutan.
 */

const migrations = [
    // 1. Core & Master Tables
    'create_essential_tables.js', // Fondasi awal (Tipe User, Jabatan)
    'src/config/migrate.js',      // Master Data (Instansi, Jenis Dokumen, dll)
    'scripts/create_users_table.js',      // User (FK ke Tipe User & Instansi)
    'scripts/create_dokumen_table.js',    // Dokumen (FK ke Users & Jenis Dokumen)
    'scripts/setup_rbac.js',

    // 3. Profiles & Advanced Schema
    'scripts/setup_advanced_profiles.js',
    'scripts/revise_schema.js', // Penting: Menyelaraskan users dan profil_pegawai

    // 4. Module: Kegiatan
    'scripts/create_kegiatan_manajemen_tables.js', // Dibutuhkan oleh trash history
    'src/config/migrate_tipe_kegiatan.js',
    'src/config/migrate_kegiatan.js',
    'scripts/run_migration_kegiatan.js',
    'src/config/create_holiday_table.js',
    'scripts/migrate_kegiatan_trash_history.js',

    // 5. Module: Surat
    'scripts/migrate_surat.js',
    'scripts/create_surat_nomor_log.js',

    // 6. AI & Knowledge (Nayaxa)
    'scripts/migrate_knowledge.js',
    'scripts/migrate_gemini_keys.js',
    'scripts/migrate_chat_history.js',

    // 7. Data Master Lainnya
    'src/config/table_mapping_urusan.js',
    'scripts/migrate_tagging.js',
    'scripts/migrate_otoritas.js',
    'scripts/create_program_kegiatan_tables.js',
    'src/config/create_templates_table.js',

    // 8. Seeding (Optional but recommended)
    'scripts/seed_wilayah.js',
    'scripts/seed_superadmin.js'
];

async function runMigrations() {
    console.log('🚀 Memulai migrasi database PPM...\n');

    let successCount = 0;
    let failCount = 0;

    for (const file of migrations) {
        const filePath = path.join(__dirname, file);
        console.log(`--------------------------------------------------`);
        console.log(`📦 Menjalankan: ${file}...`);

        try {
            // Jalankan file JS sebagai sub-proses
            const output = execSync(`node ${file}`, {
                cwd: __dirname,
                stdio: 'inherit' // Tampilkan output langsung ke console
            });

            console.log(`✅ Berhasil: ${file}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Gagal: ${file}`);
            console.error(`   Pesan: ${error.message}`);
            failCount++;

            // Lanjut ke migrasi berikutnya jika satu gagal (karena banyak script bersifat idempotent)
        }
    }

    console.log(`\n==================================================`);
    console.log(`🏁 Migrasi Selesai!`);
    console.log(`✅ Sukses: ${successCount}`);
    console.log(`❌ Gagal: ${failCount}`);
    console.log(`==================================================\n`);

    if (failCount > 0) {
        console.log('⚠️  Beberapa migrasi gagal. Mohon periksa log di atas.');
        process.exit(1);
    } else {
        console.log('✨ Database sudah siap digunakan.');
        process.exit(0);
    }
}

runMigrations();
