# Nayaxa AI Assistant v4.3 - Technical Specification & Checkpoint

Dokumen ini berfungsi sebagai referensi utama (Master Reference) untuk status stabil Nayaxa pada versi 4.3. Jika terjadi error sistem atau regresi fitur di masa depan, gunakan dokumen ini untuk mengembalikan status aplikasi.

## 📌 Metadata Versi
- **Nama Versi**: Nayaxa v4.3 "Stable Data Portability"
- **Status**: Stabil & Siap Produksi
- **Lingkungan**: Dashboard (Frontend React/Vite) & AI Engine (Node.js/Gemini)

---

## 🚀 Fitur Utama & Logika

### 1. Hybrid Brain Architecture
- **Primary Brain (DeepSeek-V3)**: Menangani seluruh logika teks, audit data, dan pemrosesan dokumen (Word/Excel/PDF).
- **Secondary Brain (Gemini 2.5 Flash)**: Digunakan untuk analisis Gambar (Vision) dan sebagai sistem cadangan (*High Availability*) jika DeepSeek sedang sibuk/down.
- **Smart Auto-Scroll**: Tampilan chat otomatis bergeser ke bawah saat ada pesan baru atau saat Nayaxa sedang mengetik.
- **Premium Link Styling**: Link sumber internet menggunakan warna Biru (Blue-600) tanpa garis bawah untuk estetika yang lebih bersih.
- **Dynamic Brain Indicator**: Menampilkan icon (D untuk DeepSeek, G untuk Gemini) sesuai dengan AI yang memproses permintaan terakhir.
- **Floating Navigation Button**: Tombol (Chevron Down) ditempatkan di luar container scroll agar tetap terapung (*fixed/absolute*) di atas chat.

### 2. Data Portability (Fitur Unggulan v4.3)
- **Rich-Text Table Copy**:
  - Komponen: `TableWithCopy`
  - Logika: Menyalin data menggunakan `ClipboardItem` dengan tipe `text/html`.
  - Keuntungan: Saat di-*paste* di Excel/Word, struktur tabel (garis dan sel) tetap terjaga (bukan teks mentah).
- **Mermaid Diagram Copy**:
  - Komponen: `Mermaid.tsx`
  - Fitur: Tombol "Salin" untuk mengambil *source code* bagan agar bisa dipindah ke editor diagram lain.

### 3. Backend Architecture & Prompt Engineering
- **Protokol "Zero Jargon"**:
  - **Protokol Anti-Halu (Checkpoint v4.3)**: Penghapusan angka contoh (*ghost numbers*) 89, 90, dan 18 dari system prompt untuk memaksa AI melakukan verifikasi database riil.
- **Transformasi Data**: AI secara otomatis menerjemahkan data teknis menjadi bahasa manusia (Contoh: `is_active=1` menjadi "Aktif").

### 4. Custom Notification System
- **Toast Logic**: Menggunakan state `toastMsg` internal di `NayaxaAssistant.tsx`.
- **AnimatePresence**: Notifikasi meluncur halus dari bawah ke atas saat aksi berhasil (misal: menyalin tabel).

---

## 🛠️ File Kunci (Struktur File)

| Komponen | Path | Tanggung Jawab |
| :--- | :--- | :--- |
| **Widget Utama** | `Frontend/src/components/NayaxaAssistant.tsx` | UI Chat, Resize, Focus, State Management |
| **Markdown Renderer** | `Frontend/src/components/NayaxaAssistant.tsx` | Parsing Markdown & Injeksi Tabel/Bagan |
| **Diagram Engine** | `Frontend/src/components/Mermaid.tsx` | Rendering skema/bagan dengan tombol salin |
| **API Connector** | `Frontend/src/services/api.ts` | Endpoint `chat`, `session`, `history`, & `insights` |
| **AI Service** | `Backend/src/services/nayaxaGeminiService.js` | Persona AI, RAG, & Filter Jargon Teknis |

---

## 🛡️ Instruksi Pemulihan (Recovery)
Jika di masa depan muncul **"Layar Putih"** atau **"Fitur Hilang"**, pastikan hal berikut di `NayaxaAssistant.tsx`:
1.  **Imports**: Pastikan `React`, `api`, `motion`, dan `NayaxaChart` di-import dengan benar di baris 1-10.
2.  **Access Rules**: Cek `isBapperida` (Line ~195). Harus mengecek `user?.role` dan `user?.tipe_user_id`.
3.  **Markdown Components**: Pastikan `code` dan `table` di dalam `ReactMarkdown` menggunakan wrapper `Mermaid` dan `TableWithCopy`.

---
*Nayaxa v4.3 - Dokumentasi ini dibuat secara otomatis untuk menjamin keberlanjutan pengembangan.*
