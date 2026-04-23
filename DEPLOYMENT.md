# Panduan Deployment - VPS Ubuntu

Dokumen ini berisi panduan langkah-demi-langkah untuk melakukan deployment aplikasi Dashboard PPM pada server VPS Ubuntu.

## Arsitektur
- **Frontend**: Vite (React) -> Disajikan oleh Nginx.
- **Backend**: Node.js (Express) -> Dikelola oleh PM2.
- **Database**: MySQL.
- **Reverse Proxy**: Nginx.

---

## 1. Persiapan Server

Update sistem dan install komponen dasar:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server git curl
```

Install Node.js (v20):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
npm install -g pm2
```

---

## 2. Konfigurasi Database

Masuk ke MySQL dan buat database:
```sql
CREATE DATABASE dashboard_ppm;
CREATE USER 'ppm_user'@'localhost' IDENTIFIED BY 'B0gork@b01!';
GRANT ALL PRIVILEGES ON dashboard_ppm.* TO 'ppm_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Deployment Backend

1. Pindahkan kode backend ke `/var/www/backend`.
2. Install dependensi: `npm install`.
3. Buat file `.env`:
   ```env
   PORT=5001
   DB_HOST=localhost
   DB_USER=ppm_user
   DB_PASS=PASSWORD_ANDA
   DB_NAME=bappedalitbang_ppm
   JWT_SECRET=STRING_RANDOM_AMAN
   ```
4. Jalankan dengan PM2:
   ```bash
   pm2 start src/index.js --name "ppm-backend"
   pm2 save
   pm2 startup
   ```

---

## 4. Deployment Frontend

1. Pindahkan kode frontend ke `/var/www/frontend`.
2. Pastikan file `.env` sudah benar:
   ```env
   VITE_API_URL=/api
   VITE_NAYAXA_API_URL=https://domain-anda.com/api/nayaxa
   VITE_NAYAXA_API_KEY=...
   ```
3. Build aplikasi:
   ```bash
   npm install
   npm run build
   ```

---

## 5. Konfigurasi Nginx

Buat file konfigurasi: `sudo nano /etc/nginx/sites-available/bappedalitbang`

```nginx
server {
    listen 80;
    server_name domain-anda.com;

    root /var/www/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy ke Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/backend/uploads;
    }
}
```

Aktifkan site:
```bash
sudo ln -s /etc/nginx/sites-available/bappedalitbang /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domain-anda.com
```
