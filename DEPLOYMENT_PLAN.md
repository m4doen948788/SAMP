# Deployment Planning - VPS Ubuntu (Dashboard)

Panduan ini berisi langkah-langkah detail untuk melakukan deployment aplikasi **Dashboard** (Frontend React/Vite + Backend Node.js/MySQL) pada server Ubuntu.

## 📋 Prasyarat
- VPS dengan OS Ubuntu 22.04 LTS atau versi terbaru.
- Akses `root` atau user dengan hak akses `sudo`.
- Nama domain yang sudah diarahkan (A Record) ke IP VPS (Opsional untuk SSL).

---

## 🚀 Langkah 1: Persiapan Server

### 1.1 Update Sistem & Firewall
```bash
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 1.2 Instalasi Node.js (via NVM)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 1.3 Instalasi PM2 & Build Tools
```bash
npm install -g pm2
sudo apt install build-essential git -y
```

---

## 🗄️ Langkah 2: Konfigurasi Database (MySQL)

### 2.1 Instalasi MySQL
```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

### 2.2 Setup Database & User
Masuk ke MySQL shell:
```bash
sudo mysql
```
Jalankan query berikut:
```sql
CREATE DATABASE dashboard_db;
CREATE USER 'dashboard_user'@'localhost' IDENTIFIED BY 'NayaxaPass2026!';
GRANT ALL PRIVILEGES ON dashboard_db.* TO 'dashboard_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## ⚙️ Langkah 3: Deployment Backend

### 3.1 Setup Folder & Install Dependensi
```bash
mkdir -p /var/www/dashboard-app
cd /var/www/dashboard-app/Backend
npm install --production
```

### 3.2 Konfigurasi Environment (`.env`)
Buat file `.env` dan sesuaikan dengan konfigurasi server:
```bash
nano .env
```
Isi contoh:
```env
PORT=5001
DB_HOST=localhost # Ubah ke localhost jika DB satu server
DB_USER=dashboard_user
DB_PASSWORD=NayaxaPass2026!
DB_NAME=dashboard_db
JWT_SECRET=gunakan_string_random_yang_panjang

# AI Service Keys
GEMINI_API_KEY=your_gemini_key
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_ENABLED=true
NAYAXA_API_KEY=NAYAXA-BAPPERIDA-8888-9999-XXXX
```

### 3.3 Menjalankan dengan PM2
```bash
pm2 start src/index.js --name "dashboard-backend"
pm2 save
pm2 startup
```

---

## 💻 Langkah 4: Deployment Frontend

### 4.1 Build Aplikasi
```bash
cd /var/www/dashboard-app/Frontend
npm install
npm run build
```
Pastikan folder `dist` telah terbuat.

---

## 🌐 Langkah 5: Konfigurasi Nginx (Reverse Proxy)

### 5.1 Buat Konfigurasi Situs
```bash
sudo nano /etc/nginx/sites-available/dashboard
```

Isi dengan konfigurasi berikut:
```nginx
server {
    listen 80;
    server_name yourdomain.com; # Ganti dengan domain/IP

    # Frontend
    location / {
        root /var/www/dashboard-app/Frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads Folder
    location /uploads/ {
        alias /var/www/dashboard-app/Backend/uploads/;
    }
}
```

### 5.2 Aktifkan Konfigurasi
```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Langkah 6: Keamanan SSL (HTTPS)

Gunakan Certbot untuk mendapatkan sertifikat SSL gratis dari Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

## 🛠️ Maintenance & Logs

- **Melihat log backend:** `pm2 logs dashboard-backend`
- **Restart aplikasi:** `pm2 restart all`
- **Status Nginx:** `sudo systemctl status nginx`
- **Update kode:**
  ```bash
  git pull
  # Jika di Backend:
  npm install && pm2 restart dashboard-backend
  # Jika di Frontend:
  npm install && npm run build
  ```

---

## ⚠️ Penting: Sinkronisasi Port & URL

Berdasarkan pemeriksaan kode Anda, terdapat beberapa hal yang perlu diperhatikan sebelum deployment:

### 1. Perbedaan Port (5001 vs 6001)
*   **Backend (.env)** menggunakan port `5001`.
*   **Frontend (Hardcoded)** menggunakan port `6001` di banyak tempat (seperti di `src/services/api.ts` dan `src/components/NayaxaAssistant.tsx`).
*   **Solusi:** Anda harus menyamakan port tersebut. Disarankan mengubah port di Backend `.env` menjadi `6001` agar sesuai dengan frontend yang sudah ada, atau melakukan pencarian dan penggantian (Find & Replace) di folder Frontend dari `6001` ke `5001`.

### 2. URL Hardcoded (localhost)
Beberapa bagian di Frontend masih menggunakan `http://localhost:6001`. Saat dideploy ke VPS, `localhost` di browser user akan merujuk ke komputer user sendiri, bukan ke server VPS.
*   **Solusi Terbaik:** Gunakan domain/IP server atau gunakan relative path.
*   **Contoh Perubahan:** 
    Ganti: `` `http://${window.location.hostname}:6001` ``
    Menjadi: `` `${window.location.origin}/api` `` (jika menggunakan Nginx proxy sesuai panduan di atas).

---
*Dibuat secara otomatis oleh Antigravity pada 2026-04-23*
