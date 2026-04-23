const pool = require('./src/config/db');

const judul = "Arsitektur & Skalabilitas Nayaxa AI";
const konten = `1. Apa Itu Arsitektur Text-to-SQL Nayaxa?
Nayaxa bukanlah chatbot konvensional biasa yang harus diajari satu per satu setiap kali ada tabel baru. Nayaxa menggunakan arsitektur Autonomous Text-to-SQL Agent.
- Dynamic Schema Extractor: Saat aplikasi menyala, sistem akan menscan ratusan nama tabel dan kolom di database secara otomatis.
- Super Tool *execute_sql_query*: Saat bertanya, Nayaxa merakit kode MySQL sendiri secara ajaib, membaca file JSON Mentah dari database, lalu menjelaskannya.
- Regex Firewall Anti-Hacker (Aman): Anda tidak perlu khawatir AI akan menghapus data. Backend telah dilengkapi firewall yang memblokir keras perintah DELETE, DROP, UPDATE. Nayaxa murni hanya diberi izin SELECT.

2. Caching Anti-Bocor & Limit Kuota (Memory MD5)
Kehadiran AI AI di Dashboard Utama sangat rentan menguras kuota API Google. Sebab, setiap kali halaman di-refresh, sistem meminta membaca ulang data.
- Solusi Caching Kriptografi: Kita menanamkan hashing MD5. Backend akan mengingat cache ringkasan ucapan AI di dalam RAM lokal server. Jika angka statistik yang diambil dari database persis sama dengan 1 menit lalu, backend TIDAK AKAN memanggil Google sama sekali. Ini menghemat 99% batas Kuota Harian!

3. Ekosistem Model: Flash vs Pro
Nayaxa dibekali dengan mesin gemini-2.5-flash.
- Flash: Sangat cepat dan murah. Ideal untuk narasi dashboard dan pencarian data ringan.
- Pro (gemini-2.5-pro): Jauh lebih lambat, namun berkali-kali lipat lebih cerdas. Bila Anda ingin kemampuan analisis tingkat dewa, ganti variabel \`DEFAULT_MODEL\` di \`nayaxaGeminiService.js\` dari flash menjadi pro.

4. Nayaxa Mode 100% OFFLINE (Bebas Internet)
Mengingat arsitektur ini sudah berlabuh di backend lokal server, kita bisa menyapih Nayaxa dari Google API seutuhnya.
- Install Ollama pada Server.
- Unduh AI Open Source (Llama-3 atau Qwen-2.5).
- Tembak API \`nayaxaGeminiService.js\` menuju local endpoint \`http://localhost:11434/v1/chat/completions\`. Maka Anda sudah punya AI seumur hidup gratis, sangat pintar, dan datanya tidak akan pernah disentuh pihak ketiga sejengkal pun.

5. Peta Ekspansi Masa Depan (Membaca PDF / Excel)
Bila telah tiba saatnya mengembangkan fitur Folder Manajemen Dokumen Digital di aplikasi ini, cukup injeksikan Module Parser Node.js kedalam toolset function calling. Nayaxa akan melek membaca puluhan halaman Excel & PDF secara sekejap!`;

async function insertGuide() {
    try {
        await pool.query('INSERT INTO buku_referensi (judul, konten) VALUES (?, ?)', [judul, konten]);
        console.log("Guide inserted successfully to Petunjuk Teknis/Referensi table.");
        process.exit(0);
    } catch(err) {
        console.error("Error inserting guide:", err);
        process.exit(1);
    }
}

insertGuide();
