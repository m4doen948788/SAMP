@echo off
echo [PPM MODULAR - STABLE MODE] Menghidupkan layanan dengan jeda stabilitas...

:: Pastikan PM2 mati jika ada
call npx pm2 delete all >nul 2>&1

cd /d d:\copy-dashboard\Backend

:: Menggunakan concurrently dengan delay (lewat pembagian perintah jika perlu, tapi kita coba satu baris dulu dengan delay internal jika ada)
:: Karena concurrently tidak punya delay bawaan per-proses, kita gunakan trik jeda di batch file jika mau terpisah, 
:: tapi mari kita coba optimasi urutan jalannya.

call npx concurrently -n "AUTH,SURAT,PERF,PLAN,SYS,FRONT,NX-BK,NX-FT" ^
  -c "blue,green,magenta,cyan,yellow,white,red,gray" ^
  --kill-others-on-fail ^
  "npm run dev:auth" ^
  "npm run dev:surat" ^
  "npm run dev:performance" ^
  "npm run dev:planning" ^
  "npm run dev:system" ^
  "cd ../Frontend && npm run dev" ^
  "cd ../../nayaxa-engine/Backend && npm run dev" ^
  "cd ../../nayaxa-engine/Frontend && npm run dev"

echo.
pause
