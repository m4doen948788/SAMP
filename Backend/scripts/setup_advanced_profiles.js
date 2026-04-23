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
        console.log("Creating tables...");

        // 1. master_bidang_instansi
        await pool.query(`
      CREATE TABLE IF NOT EXISTS master_bidang_instansi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instansi_id INT NOT NULL,
        nama_bidang VARCHAR(255) NOT NULL,
        kode_bidang VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // 2. master_sub_bidang_instansi
        await pool.query(`
      CREATE TABLE IF NOT EXISTS master_sub_bidang_instansi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bidang_instansi_id INT NOT NULL,
        nama_sub_bidang VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // 3. profil_pegawai
        await pool.query(`
      CREATE TABLE IF NOT EXISTS profil_pegawai (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tempat_lahir VARCHAR(255),
        tanggal_lahir DATE,
        jenis_kelamin ENUM('L', 'P'),
        agama VARCHAR(100),
        status_perkawinan VARCHAR(100),
        golongan_darah VARCHAR(5),
        alamat_lengkap TEXT,
        npwp VARCHAR(50),
        no_bpjs_kesehatan VARCHAR(50),
        no_bpjs_ketenagakerjaan VARCHAR(50),
        pangkat_golongan_id INT,
        tmt_cpns DATE,
        tmt_pns DATE,
        masa_kerja_tahun INT,
        masa_kerja_bulan INT,
        pendidikan_terakhir VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        console.log("Tables created. Injecting configurations...");

        // Heloer safely insert config
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

        const bidangCols = [
            { nama: "ID Instansi", nama_db: "instansi_id", tipe: "number", wajib: true },
            { nama: "Nama Bidang", nama_db: "nama_bidang", tipe: "string", wajib: true },
            { nama: "Kode Bidang", nama_db: "kode_bidang", tipe: "string", wajib: false }
        ];
        const subBidangCols = [
            { nama: "ID Bidang", nama_db: "bidang_instansi_id", tipe: "number", wajib: true },
            { nama: "Nama Sub Bidang", nama_db: "nama_sub_bidang", tipe: "string", wajib: true }
        ];

        const bidangId = await insertConfig('master_bidang_instansi', 'Master Bidang (Per Instansi)', bidangCols);
        const subBidangId = await insertConfig('master_sub_bidang_instansi', 'Master Sub Bidang (Per Instansi)', subBidangCols);

        console.log("Config injected. Injecting generated pages...");

        // Pages
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

        const bidangPageId = await insertPage('/master-bidang-instansi', 'Kelola Bidang Instansi', 'master_bidang_instansi');
        const subBidangPageId = await insertPage('/master-sub-bidang-instansi', 'Kelola Sub Bidang Instansi', 'master_sub_bidang_instansi');

        console.log("Pages injected. Injecting Menu items...");

        // Insert to Kelola Menu 
        // We want to add them under a logic root, say root menu for Masters, if not, just top level for now
        // Actually wait, can put them under internal parent = null with a manual icon, 
        // Or we provide a parent_id... for now we'll put them top level
        const insertMenu = async (nama_menu, action_page) => {
            const [ex] = await pool.query("SELECT id FROM kelola_menu WHERE action_page = ?", [action_page]);
            if (ex.length === 0) {
                await pool.query("INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active) VALUES (?, 'menu1', ?, ?, ?, ?, ?)",
                    [nama_menu, action_page, 'Database', null, 10, 1]
                );
            }
        };
        await insertMenu('Data Bidang', '/master-bidang-instansi');
        await insertMenu('Data Sub Bidang', '/master-sub-bidang-instansi');

        console.log("All done.");

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
