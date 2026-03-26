const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertGuide() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const judul = "Nayaxa AI: Konsep Orchestrator Data Lintas Sektoral";
    const konten = `Nayaxa tidak hanya "membaca teks", tetapi bertindak sebagai Orchestrator (Dirigen) data lintas sektor di Pemerintah Daerah.

Pola Pikir Lintas Sektor (Cross-Domain Analysis):
Jika Anda bertanya tentang isu spesifik seperti TBC, Nayaxa akan melakukan langkah otomatis:
1. Kesehatan: Memanggil API Simpus/Dinkes untuk tren kasus.
2. Lingkungan: Memanggil database PUPR/Perkim untuk akses air bersih.
3. Sosial Ekonomi: Mengambil data DTKS untuk kategori kemiskinan.
4. Sintesis: Memberikan kesimpulan korelasi antar data yang berbeda dinas.

Cara Kerja (Function Calling):
Nayaxa menggunakan fitur "Function Calling" (Alat Bantu) untuk memanggil API aplikasi teknis apapun yang terhubung. Gemini akan memutuskan secara cerdas kapan harus menggunakan alat tersebut berdasarkan konteks pertanyaan.

Keunggulan:
Menghubungkan titik-titik (Connecting the dots) data yang selama ini terpisah di berbagai OPD (Siloisasi Data).`;

    try {
        console.log('Inserting technical guide...');
        await connection.execute(
            'INSERT INTO buku_referensi (judul, konten, is_superadmin_only) VALUES (?, ?, ?)',
            [judul, konten, true]
        );
        console.log('Guide inserted successfully as Superadmin Only!');
    } catch (err) {
        console.error('Failed to insert guide:', err.message);
    } finally {
        await connection.end();
    }
}

insertGuide();
