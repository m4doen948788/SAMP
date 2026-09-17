const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const columns = [
    { nama: "User ID", nama_db: "user_id", tipe: "number", wajib: true },
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
    { nama: "Pendidikan Terakhir", nama_db: "pendidikan_terakhir", tipe: "string", wajib: false }
];

async function run() {
    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection(dbConfig);

        console.log('Updating master_data_config...');
        await conn.query(
            'UPDATE master_data_config SET kolom = ? WHERE nama_tabel = ?',
            [JSON.stringify(columns), 'profil_pegawai']
        );

        console.log('Updating generated_pages...');
        await conn.query(
            'UPDATE generated_pages SET slug = ?, title = ?, icon = ? WHERE table_name = ?',
            ['data-profil-pegawai', 'Data Profil Pegawai', 'UserCircle', 'profil_pegawai']
        );

        console.log('Updating kelola_menu...');
        // Find Master Data ID
        const [masterMenu] = await conn.query('SELECT id FROM kelola_menu WHERE nama_menu = ? AND tipe = ?', ['Master Data', 'menu1']);
        const masterId = masterMenu.length > 0 ? masterMenu[0].id : 42;

        await conn.query(
            'UPDATE kelola_menu SET parent_id = ?, action_page = ?, icon = ? WHERE nama_menu = ?',
            [masterId, 'data-profil-pegawai', 'UserCircle', 'Data Profil Pegawai']
        );

        console.log('Successfully registered profil_pegawai to Master Data.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.end();
    }
}

run();
