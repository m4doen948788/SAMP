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
        const insertConfig = async (nama_tabel, label, kolom) => {
            const [existing] = await pool.query("SELECT id FROM master_data_config WHERE nama_tabel = ?", [nama_tabel]);
            if (existing.length === 0) {
                const [res] = await pool.query('INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                    [nama_tabel, label, JSON.stringify(kolom)]
                );
                return res.insertId;
            }
            return existing[0].id;
        };

        const cols = [
            { nama: "User ID", nama_db: "user_id", tipe: "number", wajib: true },
            { nama: "Tempat Lahir", nama_db: "tempat_lahir", tipe: "string", wajib: false },
            { nama: "Tanggal Lahir", nama_db: "tanggal_lahir", tipe: "date", wajib: false },
            { nama: "Jenis Kelamin", nama_db: "jenis_kelamin", tipe: "string", wajib: false },
            { nama: "Agama", nama_db: "agama", tipe: "string", wajib: false },
            { nama: "Alamat", nama_db: "alamat_lengkap", tipe: "string", wajib: false },
            { nama: "NPWP", nama_db: "npwp", tipe: "string", wajib: false },
            { nama: "No BPJS Kes", nama_db: "no_bpjs_kesehatan", tipe: "string", wajib: false },
            { nama: "No BPJS TK", nama_db: "no_bpjs_ketenagakerjaan", tipe: "string", wajib: false }
        ];

        await insertConfig('profil_pegawai', 'Master Profil Pegawai', cols);

        const insertPage = async (slug, title, tableName) => {
            const [existing] = await pool.query("SELECT id FROM generated_pages WHERE slug = ?", [slug]);
            if (existing.length === 0) {
                const [res] = await pool.query('INSERT INTO generated_pages (slug, title, table_name) VALUES (?, ?, ?)',
                    [slug, title, tableName]
                );
                return res.insertId;
            }
            return existing[0].id;
        };

        await insertPage('/master-profil-pegawai', 'Kelola Profil Pegawai', 'profil_pegawai');

        const insertMenu = async (nama_menu, action_page) => {
            const [ex] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [action_page]);
            if (ex.length === 0) {
                await pool.query("INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu2', ?, ?, ?, ?, ?)",
                    [nama_menu, action_page, 'Users', null, 11, 1]
                );
            }
        };
        await insertMenu('Data Profil Pegawai', '/master-profil-pegawai');

        console.log("profil_pegawai seeded to config, pages, and menus.");

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
