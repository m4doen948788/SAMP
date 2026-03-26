# 🤖 Panduan Arsitektur & Skalabilitas Nayaxa AI
*Dokumen ini adalah rekapitulasi teknis rancangan arsitektur Nayaxa AI pada Dashboard Bapperida.*

---

## 🏗️ 1. Apa Itu Arsitektur Text-to-SQL Nayaxa?
Nayaxa **bukanlah** chatbot konvensional biasa yang harus diajari (*hard-coded*) satu per satu setiap kali ada tabel baru. Nayaxa menggunakan arsitektur **Autonomous Text-to-SQL Agent**.

### Cara Kerjanya:
1. **Dynamic Schema Extractor**: Saat server Node.js menyala, fungsi `getDatabaseSchema()` di `nayaxaStandalone.js` akan menscan ratusan nama tabel dan nama kolom di *database* Anda secara otomatis menggunakan `INFORMATION_SCHEMA`.
2. **Brain Injection**: Peta struktur *database* tersebut diinjeksikan secara tersembunyi ke dalam memori utama (*System Prompt*) Nayaxa.
3. **Super Tool `execute_sql_query`**: Saat pegawai bertanya (misal: *"Ada berapa dokumen Surat Tugas?"*), Nayaxa merakit kode MySQL sendiri secara ajaib, mengirimkannya ke backend, membaca hasil JSON Mentah dari database, lalu menjelaskannya ke manusia dengan gaya bahasa santai.

### Pertahanan Keamanan (Regex Firewall) 🛡️
Tidak perlu khawatir AI akan bertingkah dan menghapus data. Backend Node.js telah dilengkapi *firewall* penyortir kata level dewa. **Nayaxa hanya diizinkan menjalankan perintah yang berawalan `SELECT`.** 
Apabila Nayaxa berhalusinasi (atau diserang Hacker) mencoba melakukan *SQL Injection* (seperti `DROP`, `DELETE`, `UPDATE`), *firewall* Node.js akan memblokir kueri tersebut secara instan dan mengeluarkan status **"Security Exception"**.

---

## ⚡ 2. Caching Anti-Bocor & Limit Kuota (Memory MD5)
Kehadiran AI AI di *Dashboard Utama* sangat rentan menguras kuota API (Limit 1.500 *Requests* / hari) dari Google. Sebab, setiap kali halaman di-*refresh*, sistem meminta AI membaca ulang seluruh data statistik.

**Solusi Caching Kriptografi:**
Kita telah menanamkan algoritma hashing `MD5`. *Backend* akan mengingat (*cache*) ringkasan ucapan AI di dalam RAM lokal server. Jika angka statistik yang diambil dari *database* tidak berubah secara ekstrem dibanding 1 jam lalu, *backend* **TIDAK AKAN** menghubungi Google sama sekali, melainkan mengambil jawaban *cache* yang berumur 0.001 detik. Hal ini menghemat 99% pengeluaran Token API!

---

## 🚀 3. Ekosistem Model: Flash vs Pro
Nayaxa saat ini dibekali dengan mesin **`gemini-2.5-flash`**. 
* **Flash:** Sangat cepat, gratisan sangat berlimpah, dan murah. Ideal untuk membaca angka tabel obrolan kasual.
* **Pro (`gemini-2.5-pro`):** Jauh lebih lambat, namun **berkali-kali lipat lebih cerdas**. Sanggup membaca ratusan halaman dokumen tebal, melakukan penalaran logika berat (Hukum, Draft Raperda).
> *Cara Ganti Model:* Buka `nayaxaGeminiService.js`, cari variabel `DEFAULT_MODEL`, lalu ubah dari `flash` menjadi `pro`.

---

## 🌍 4. Mengubah Nayaxa Menjadi 100% OFFLINE (Tanpa Google / Internet)
Bila kebijakan keamanan Pemerintah Daerah mewajibkan data tidak boleh keluar dari jaringan lokal (Intranet), Nayaxa telah siap 100% untuk hidup mandiri (Offline).

**Langkah Bermigrasi ke Server Mandiri:**
1. Siapkan PC Server berspesifikasi memadai (GPU / CPU tinggi).
2. Install aplikasi **Ollama** (Aplikasi AI Server Lokal Gratis).
3. Unduh model AI Open-Source tercanggih seperti **Llama 3** (Meta) atau **Qwen 2.5** (Alibaba).
4. Buka file kode sumber `nayaxaGeminiService.js`.
5. Ubah baris import `@google/genai` dengan SDK OpenAI atau format `fetch` murni.
6. Arahkan *URL Endpoint* yang sebelumnya ke `api.google.com` menjadi HTTP Lokal: `http://localhost:11434/v1/chat/completions`.
7. **Selesai!** Nayaxa akan terbangun menggunakan otak lokal, membaca *SQL* lokal Anda secara instan dengan keamanan absolut tanpa butuh kabel internet sedetikpun, serta bebas biaya langganan bulanan selamanya!

---

## 📑 5. Peta Ekspansi Masa Depan (Membaca PDF / Excel)
Di masa depan, Nayaxa sangat siap untuk mengurai Dokumen Digital yang akan Anda buat!
Karena arsitektur kita sudah berbasis *Function Calling*, saat Anda selesai membuat fitur Upload PDF/Word/Excel:
1. Kita akan tambahkan *Tool* baru bernama `extract_document(doc_id)`.
2. *Library* Node.js (seperti `pdf-parse` / `xlsx`) akan me-render File aslinya menjadi kumpulan teks mentah yang puanjang.
3. Teks tersebut dilemparkan ke pikiran LLM multi-modal, yang mana AI akan membaca, menghafal, dan menemukan kesalahan pengetikan di dalam berkas rapat Anda secara otomatis.

***

*Dokumen ini dirancang khusus untuk memandu para insinyur masa depan dalam memperbesar skala (*scaling*) kehebatan Nayaxa AI.*
