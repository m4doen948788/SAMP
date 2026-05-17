@echo off
echo [PPM MODULAR - STABLE MODE] Menghidupkan layanan dengan jeda stabilitas...

:: Pastikan PM2 mati jika ada
call npx.cmd pm2 delete all >nul 2>&1

:: Bersihkan proses Node.js lama (zombie dari sesi sebelumnya)
:: [SURGICAL CLEANUP] Mematikan hanya proses yang menduduki port aplikasi ini (5001-5005, 3000, 6001, 5173)
echo [CLEANUP] Melakukan 'Surgical Strike' pada port yang terpakai...
powershell -Command "5001,5002,5003,5004,5005,3000,6001,5173 | ForEach-Object { $p = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue; if($p) { $p | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } }"
echo [CLEANUP] Port dibersihkan. Memulai layanan dalam 2 detik...
timeout /t 2 >nul

cd /d d:\copy-dashboard\Backend

call npx.cmd concurrently -n "AUTH,SURAT,PERF,PLAN,SYS,FRONT,NX-BK,NX-FT" ^
  -c "blue,green,magenta,cyan,yellow,white,red,gray" ^
  "npm.cmd run dev:auth" ^
  "npm.cmd run dev:surat" ^
  "npm.cmd run dev:performance" ^
  "npm.cmd run dev:planning" ^
  "npm.cmd run dev:system" ^
  "cd ../Frontend && npm.cmd run dev" ^
  "cd ../../nayaxa-engine/Backend && npm.cmd run dev" ^
  "cd ../../nayaxa-engine/Frontend && npm.cmd run dev"

echo.
pause
