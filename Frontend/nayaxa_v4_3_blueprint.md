# 🌌 Nayaxa v4.3: The Grand Blueprint (Master Checkpoint)

Dokumen ini adalah repositori pengetahuan lengkap tentang **Nayaxa AI Assistant versi 4.3**. Dokumen ini dirancang sebagai "titik pemulihan" sistem secara utuh—mencakup arsitektur jaringan, logika kecerdasan buatan, sistem memori, hingga manifestasi persona.

---

## 1. 🌐 The Circuit: Arsitektur Jaringan (Connectivity)
Nayaxa bekerja dengan menjembatani interaksi pengguna di dashboard dengan kekuatan komputasi awan.

- **Frontend Bridge**: `src/components/NayaxaAssistant.tsx` adalah gerbang utama. Pesan dikirim melalui modul `api.ts` menggunakan HTTP POST ke endpoint `/api/nayaxa/chat`.
- **API Security**: Menggunakan `x-api-key` statis (`NAYAXA-BAPPERIDA-8888...`) untuk otentikasi antara Dashboard dan AI Engine.
- **Middleware Flow**:
  1. User mengetik pesan -> [Frontend]
  2. [Backend Node.js] menerima pesan & file.
  3. [nayaxaGeminiService] memproses teks & file (Excel/Word dikonversi ke teks sebelum dikirim ke AI).
  4. [Google Gemini API] memproses instruksi.
  5. Jika butuh data, [Tool Call] dipicu ke `nayaxaStandalone`.

---

## 2. 🧠 The Brain: Otak Utama (Hybrid Intelligence)
Nayaxa v4.3 menggunakan arsitektur **Dual-Brain** yang cerdas:

- **DeepSeek-V3 (Primary Brain)**: Digunakan sebagai otak utama untuk memproses teks, file Excel, Word, dan PDF. Dipilih karena akurasi data dan pemrosesan logika dokumen yang superior.
- **Gemini 2.5 Flash (Vision & Fallback Brain)**: Digunakan khusus untuk memproses **Gambar** (Visi) atau sebagai cadangan otomatis jika DeepSeek mengalami gangguan/limit.
- **Keputusan Alat (Function Calling)**: Nayaxa tidak hanya menjawab, tapi bisa "bertindak" menggunakan alat:
  - `execute_sql_query`: Akses langsung ke database dashboard (Read-Only).
  - `search_internet`: Mencari informasi publik (dengan sistem *Resilience* multi-API: Serper, Bing, Wikipedia).
  - `generate_chart`: Membuat visualisasi data instan.
- **Zero Jargon Policy**: Protokol yang memaksa AI menerjemahkan kode internal (seperti `tipe_user_id: 1`) menjadi bahasa manusia yang ramah.
- **Anti-Hallucination Protocol**: Larangan keras penggunaan angka contoh (89, 90, 18) dalam instruksi sistem. AI wajib melakukan tool-call ke database riil sebelum menyajikan statistik apapun.
- **Multi-Key Rotation**: Sistem otomatis berganti API Key jika satu kunci terkena limit (*Rate Limit* 429 atau 503).

---

## 3. 📂 The Mind: Sistem Memori & Pengetahuan
Nayaxa memiliki dua jenis memori yang bekerja secara sinkron:

### A. Memori Jangka Pendek (Konteks Sesi)
- Disimpan di tabel `sessions` dan `chat_history`.
- Mengingat alur percakapan terakhir agar jawaban tetap relevan.

### B. Memori Jangka Panjang (Knowledge Base)
- **RAG (Retrieval-Augmented Generation)**: Dokumen PDF/Excel yang diunggah dipelajari dan disimpan di tabel `nayaxa_knowledge`.
- **Master Data Glossary**: Kamus otomatis yang memberi tahu AI tentang daftar Instansi dan Bidang di pemerintahan daerah.
- **Predictive Context**: Melalui fungsi `getLastUserActivity`, Nayaxa tahu apa yang baru saja dilakukan user di dashboard (misal: "Saya lihat Anda baru saja mengunggah notulen...") untuk menyapa secara proaktif.

---

## 4. 🎭 The Soul: Persona & Gaya Bahasa
Nayaxa bukan sekadar robot, ia memiliki "jiwa" yang didefinisikan secara ketat:

- **Identitas**: Asisten AI Bapperida yang ramah dan empatik.
- **Gaya Bicara**:
  - **Sangat Ramah**: Menggunakan sapaan hangat dan nama user.
  - **Profesional & Elegan**: Tanpa emoji, menggunakan Markdown premium (Tabel, Heading).
  - **Proaktif**: Selalu menutup jawaban dengan pertanyaan atau tawaran bantuan tambahan.
- **UI Experience**:
  - Layout *Glassmorphism* yang modern.
  - Tabel yang bisa disalin ke Excel dengan format utuh (Rich HTML).
  - **Premium Link Styling**: Link sumber internet menggunakan warna Biru (Blue-600) tanpa garis bawah untuk estetika yang lebih bersih.
- **Floating Navigation Button**: Tombol navigasi (Chevron Down) yang melayang tetap di posisi bawah panel assistan meskipun pesan di belakangnya di-scroll, memudahkan akses cepat ke chat terbaru.
- **Smart Auto-Scroll**: Fokus otomatis ke percakapan terbaru setiap ada pesan masuk.
- **Focus Auto-Cursor**: Fokus otomatis kursor ke area ketik saat panel dibuka.

---

## 🛠️ Daftar File Kunci v4.3

| Komponen | Path Lokasi | Deskripsi |
| :--- | :--- | :--- |
| **Logic Frontend** | `Frontend/src/components/NayaxaAssistant.tsx` | Pusat UI & Event Handling |
| **Brain Engine** | `Backend/src/services/nayaxaGeminiService.js` | Logika AI & Persona |
| **Smart Tools** | `Backend/src/services/nayaxaStandalone.js` | Kalkulasi Statistik, SQL, & Internet Search |
| **Knowledge** | `Backend/src/services/knowledgeTool.js` | Sistem penyimpanan pengetahuan |
| **Data Types** | `Frontend/src/services/api.ts` | Struktur komunikasi data |

---
*Dokumen ini adalah "Nyawa Teknis" dari Nayaxa v4.3. Simpan dokumen ini sebagai standar baku sistem.*
