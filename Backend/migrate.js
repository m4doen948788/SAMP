const { execSync } = require('child_process');
const path = require('path');

/**
 * Script untuk menjalankan seluruh migrasi database secara berurutan.
 */

const migrations = [
    // 1. Core & Master Tables
    'create_essential_tables.js', // Fondasi awal
    'src/config/migrate.js',
    'create_dokumen_table.js',    // Dibutuhkan oleh surat dan tagging

    // 2. User & Auth
    'create_users_table.js',
    'setup_rbac.js',

    // 3. Profiles & Advanced Schema
    'setup_advanced_profiles.js',
    'revise_schema.js', // Penting: Menyelaraskan users dan profil_pegawai

    // 4. Module: Kegiatan
    'create_kegiatan_manajemen_tables.js', // Dibutuhkan oleh trash history
    'src/config/migrate_tipe_kegiatan.js',
    'src/config/migrate_kegiatan.js',
    'run_migration_kegiatan.js',
    'src/config/create_holiday_table.js',
    'migrate_kegiatan_trash_history.js',

    // 5. Module: Surat
    'src/migrate_surat.js',
    'create_surat_nomor_log.js',

    // 6. AI & Knowledge (Nayaxa)
    'migrate_knowledge.js',
    'migrate_gemini_keys.js',
    'migrate_chat_history.js',

    // 7. Data Master Lainnya
    'src/config/table_mapping_urusan.js',
    'migrate_tagging.js',
    'migrate_otoritas.js',
    'create_program_kegiatan_tables.js',

    // 8. Seeding (Optional but recommended)
    'seed_wilayah.js',
    'seed_superadmin.js'
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
