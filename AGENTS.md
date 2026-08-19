# Aturan Pengembangan Proyek SAMP & Keamanan File Uploads

## 1. Aturan Pengelolaan File / Uploads (STRICT & ABSOLUTE)
* **DILARANG KERAS MENGOTAK-ATIK, MEMINDAHKAN, ATAU MENGHAPUS FOLDER UPLOADS**: Setiap agen AI DILARANG KERAS memodifikasi, memindahkan, menghapus, atau mengeksekusi perintah pembersihan (seperti `git clean -fd`, `rm -rf`, `unlink`, dsb) pada direktori penyimpanan berkas statis (`/home/ppm/uploads_ppm_storage`, `Backend/uploads`, `uploads`, dsb).
* **Proteksi Git Clean & Deployment**:
  - Perintah `git clean` di server/VPS HANYA BOLEH menggunakan pengecualian eksplisit: `git clean -fd -e Backend/uploads -e uploads -e "Backend/uploads/*" -e "uploads/*"`.
  - Folder penyimpanan luar `/home/ppm/uploads_ppm_storage` adalah zona steril data produksi dan tidak boleh tersentuh oleh perintah skrip otomatis apa pun.
* **Batasan Git Commit & Push**:
  - Commit dan push HANYA boleh menargetkan file source code resmi (Backend & Frontend) yang berkaitan langsung dengan fitur yang diminta.
  - Jangan pernah memasukkan berkas dari folder `uploads` ke dalam git history.

## 2. Struktur Penyimpanan File VPS
* Penyimpanan fisik berkas di VPS terisolasi permanen di `/home/ppm/uploads_ppm_storage/` dan dihubungkan via Symbolic Link ke `Backend/uploads`. Agen dilarang memutuskan atau menghapus symlink tersebut.

## 3. Standar Fitur UI: Quick Action Feature (QAF)
* **Definisi QAF**: QAF (*Quick Action Feature*) adalah tombol menu aksi 3-titik (`MoreVertical` / `...`) yang muncul secara halus (*opacity hover*) saat kursor mengarah ke nama item/dokumen/link pada tabel atau list.
* **Komponen & Menu Standar QAF (3 Opsi Utama Saat Ini)**:
  1. ⚡ **Tambahkan / Hapus dari Quick Access** (Toggle `is_quick_access`).
  2. 📋 **Salin Link Publik** (Copy URL ke clipboard).
  3. 📊 **Jadikan SKP / Catatan** (Mapping ke butir SKP/kinerja jika relevan).

## 4. Aturan Git Push & Build (PROSEDURAL & KENDALI USER)
* **DILARANG MELAKUKAN GIT PUSH DAN BUILD TANPA PERINTAH**: Setiap agen AI dilarang keras untuk mengeksekusi perintah build (`npm run build`, `vite build`, dsb) atau melakukan push ke repositori git (`git push`, dsb) secara otomatis, kecuali ada perintah eksplisit yang jelas dari pengguna.
* **DILARANG MENCARI KUNCI SSH ATAU MELAKUKAN KONEKSI SSH**: Agen dilarang keras mencari kunci SSH atau mencoba melakukan koneksi SSH ke server VPS. Cukup lakukan git push ke remote `origin prod` untuk proyek SAMP jika diperintahkan. Seluruh detail prosedur deployment dapat dirujuk pada file [DEPLOYMENT.md](file:///D:/SAMP/DEPLOYMENT.md).
