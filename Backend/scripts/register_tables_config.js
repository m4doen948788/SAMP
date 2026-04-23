const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Registering/updating master_data_config entries...\n');

        // ==============================
        // 1. Users table config
        // ==============================
        const usersCols = [
            { nama: "Profil Pegawai ID", nama_db: "profil_pegawai_id", tipe: "number", wajib: false },
            { nama: "Username", nama_db: "username", tipe: "string", wajib: true },
            { nama: "Password", nama_db: "password", tipe: "string", wajib: true },
        ];

        const [existingUsers] = await pool.query("SELECT id FROM master_data_config WHERE nama_tabel = ?", ['users']);
        if (existingUsers.length === 0) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                ['users', 'Users', JSON.stringify(usersCols)]
            );
            console.log('✅ Registered: users');
        } else {
            await pool.query(
                'UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?',
                [JSON.stringify(usersCols), 'users']
            );
            console.log('✅ Updated: users');
        }

        // ==============================
        // 2. Profil Pegawai table config
        // ==============================
        const profilCols = [
            { nama: "Nama Lengkap", nama_db: "nama_lengkap", tipe: "string", wajib: true },
            { nama: "Email", nama_db: "email", tipe: "string", wajib: false },
            { nama: "No HP", nama_db: "no_hp", tipe: "string", wajib: false },
            { nama: "Tipe User ID", nama_db: "tipe_user_id", tipe: "number", wajib: false },
            { nama: "Instansi ID", nama_db: "instansi_id", tipe: "number", wajib: false },
            { nama: "Jabatan ID", nama_db: "jabatan_id", tipe: "number", wajib: false },
            { nama: "Sub Bidang ID", nama_db: "sub_bidang_id", tipe: "number", wajib: false },
            { nama: "Foto Profil", nama_db: "foto_profil", tipe: "text", wajib: false },
            { nama: "Aktif", nama_db: "is_active", tipe: "number", wajib: false },
            { nama: "Tempat Lahir", nama_db: "tempat_lahir", tipe: "string", wajib: false },
            { nama: "Tanggal Lahir", nama_db: "tanggal_lahir", tipe: "date", wajib: false },
            { nama: "Jenis Kelamin", nama_db: "jenis_kelamin", tipe: "string", wajib: false },
            { nama: "Agama", nama_db: "agama", tipe: "string", wajib: false },
            { nama: "Status Perkawinan", nama_db: "status_perkawinan", tipe: "string", wajib: false },
            { nama: "Golongan Darah", nama_db: "golongan_darah", tipe: "string", wajib: false },
            { nama: "Alamat Lengkap", nama_db: "alamat_lengkap", tipe: "text", wajib: false },
            { nama: "NPWP", nama_db: "npwp", tipe: "string", wajib: false },
            { nama: "No BPJS Kesehatan", nama_db: "no_bpjs_kesehatan", tipe: "string", wajib: false },
            { nama: "No BPJS Ketenagakerjaan", nama_db: "no_bpjs_ketenagakerjaan", tipe: "string", wajib: false },
            { nama: "Pangkat/Golongan ID", nama_db: "pangkat_golongan_id", tipe: "number", wajib: false },
            { nama: "TMT CPNS", nama_db: "tmt_cpns", tipe: "date", wajib: false },
            { nama: "TMT PNS", nama_db: "tmt_pns", tipe: "date", wajib: false },
            { nama: "Masa Kerja Tahun", nama_db: "masa_kerja_tahun", tipe: "number", wajib: false },
            { nama: "Masa Kerja Bulan", nama_db: "masa_kerja_bulan", tipe: "number", wajib: false },
            { nama: "Pendidikan Terakhir", nama_db: "pendidikan_terakhir", tipe: "string", wajib: false },
        ];

        const [existingProfil] = await pool.query("SELECT id FROM master_data_config WHERE nama_tabel = ?", ['profil_pegawai']);
        if (existingProfil.length === 0) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                ['profil_pegawai', 'Profil Pegawai', JSON.stringify(profilCols)]
            );
            console.log('✅ Registered: profil_pegawai');
        } else {
            await pool.query(
                'UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?',
                [JSON.stringify(profilCols), 'profil_pegawai']
            );
            console.log('✅ Updated: profil_pegawai');
        }

        // ==============================
        // 3. Master Program table config
        // ==============================
        const programCols = [
            { nama: "Bidang Urusan", nama_db: "urusan_id", tipe: "select", source_table: "master_bidang_urusan", display_column: "urusan", wajib: true },
            { nama: "Kode Program", nama_db: "kode_program", tipe: "string", wajib: true },
            { nama: "Nama Program", nama_db: "nama_program", tipe: "text", wajib: true },
        ];

        const [existingProgram] = await pool.query("SELECT id FROM master_data_config WHERE nama_tabel = ?", ['master_program']);
        if (existingProgram.length === 0) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                ['master_program', 'Master Program', JSON.stringify(programCols)]
            );
            console.log('✅ Registered: master_program');
        } else {
            await pool.query(
                'UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?',
                [JSON.stringify(programCols), 'master_program']
            );
            console.log('✅ Updated: master_program');
        }

        // ==============================
        // 4. Master Kegiatan table config
        // ==============================
        const kegiatanCols = [
            { nama: "Program", nama_db: "program_id", tipe: "select", source_table: "master_program", display_column: "nama_program", wajib: true },
            { nama: "Kode Kegiatan", nama_db: "kode_kegiatan", tipe: "string", wajib: true },
            { nama: "Nama Kegiatan", nama_db: "nama_kegiatan", tipe: "text", wajib: true },
        ];

        const [existingKegiatan] = await pool.query("SELECT id FROM master_data_config WHERE nama_tabel = ?", ['master_kegiatan']);
        if (existingKegiatan.length === 0) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                ['master_kegiatan', 'Master Kegiatan', JSON.stringify(kegiatanCols)]
            );
            console.log('✅ Registered: master_kegiatan');
        } else {
            await pool.query(
                'UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?',
                [JSON.stringify(kegiatanCols), 'master_kegiatan']
            );
            console.log('✅ Updated: master_kegiatan');
        }

        // ==============================
        // 5. Master Sub Kegiatan table config
        // ==============================
        const subKegiatanCols = [
            { nama: "Kegiatan", nama_db: "kegiatan_id", tipe: "select", source_table: "master_kegiatan", display_column: "nama_kegiatan", wajib: true },
            { nama: "Kode Sub Kegiatan", nama_db: "kode_sub_kegiatan", tipe: "string", wajib: true },
            { nama: "Nama Sub Kegiatan", nama_db: "nama_sub_kegiatan", tipe: "text", wajib: true },
        ];

        const [existingSubKegiatan] = await pool.query("SELECT id FROM master_data_config WHERE nama_tabel = ?", ['master_sub_kegiatan']);
        if (existingSubKegiatan.length === 0) {
            await pool.query(
                'INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                ['master_sub_kegiatan', 'Master Sub Kegiatan', JSON.stringify(subKegiatanCols)]
            );
            console.log('✅ Registered: master_sub_kegiatan');
        } else {
            await pool.query(
                'UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?',
                [JSON.stringify(subKegiatanCols), 'master_sub_kegiatan']
            );
            console.log('✅ Updated: master_sub_kegiatan');
        }

        console.log('\n✅ Selesai! Kedua tabel sudah terdaftar di master_data_config.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
