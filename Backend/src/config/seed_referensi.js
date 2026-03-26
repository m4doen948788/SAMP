const pool = require('./db');

async function seedReferensi() {
    try {
        // 1. Create the table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS buku_referensi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                judul VARCHAR(255) NOT NULL,
                konten TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('buku_referensi table created or verified.');

        // 2. Insert initial content if empty
        const [rows] = await pool.query('SELECT id FROM buku_referensi');
        if (rows.length === 0) {
            const kontenText = `Langkah 1: Buat Tabel Fisik di Database (Menu "Buat Master Data")
Buka menu Buat Master Data di Sidebar.
Klik tombol + Master Data Baru.
Masukkan Label (contoh: Master Agama). Sistem akan otomatis membuatkan nama tabelnya di kotak sebelahnya (contoh: master_agama).
Di bagian Definisi Kolom, tambahkan kolom-kolom apa saja yang Anda inginkan beserta tipe datanya. (Misalnya: kolom nama tipe Teks Pendek, kolom deskripsi tipe Teks Panjang).
Klik Simpan/Buat Master Data. (Di tahap ini, sistem sudah mengeksekusi perintah SQL secara background untuk membuatkan tabel fisik master_agama langsung di dalam database MySQL Anda!)

Langkah 2: Buat Halamannya di Sidebar (Menu "Generator Halaman")
Lanjut buka menu Generator Halaman.
Pilih di bawah menu apa halaman baru ini akan diletakkan (Misal: jadikan sub-menu di bawah MASTER DATA).
Di pilihan tabel, pilih tabel yang baru saja Anda buat di Langkah 1 (master_agama).
Ketikkan nama menu yang akan muncul di Sidebar (Misal: MASTER AGAMA).
Klik Generate Halaman. (Sistem akan merangkai menu baru di kelola_menu dan menghubungkannya dengan komponen tabel dinamis).`;

            await pool.query(
                'INSERT INTO buku_referensi (judul, konten) VALUES (?, ?)',
                ['membuat halaman dan database baru', kontenText]
            );
            console.log('Initial content inserted into buku_referensi.');
        }

        // 3. Insert menu
        const [menuRows] = await pool.query('SELECT action_page FROM kelola_menu WHERE action_page = "petunjuk-teknis"');
        if (menuRows.length === 0) {
            // Find "MASTER DATA" to get its order loosely. The user wants it "di bawah menu1 master data"
            const [masterRow] = await pool.query('SELECT urutan FROM kelola_menu WHERE nama_menu = "MASTER DATA" LIMIT 1');
            const targetUrutan = masterRow.length > 0 ? masterRow[0].urutan + 1 : 10;

            // Increment others to make space
            await pool.query('UPDATE kelola_menu SET urutan = urutan + 1 WHERE parent_id IS NULL AND urutan >= ?', [targetUrutan]);

            await pool.query(`
                INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
                VALUES (?, ?, ?, ?, NULL, ?, ?)
            `, ['PETUNJUK TEKNIS', 'menu1', 'petunjuk-teknis', 'BookOpen', targetUrutan, 1]);
            console.log('PETUNJUK TEKNIS menu added.');
        } else {
            console.log('PETUNJUK TEKNIS menu already exists.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedReferensi();
