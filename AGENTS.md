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
