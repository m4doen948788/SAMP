@echo off
echo [PPM MODULAR] Memulai Dashboard per Modul...

:: 1. Backend Services (Dashboard)
start "BACKEND: Auth" cmd /k "cd /d d:\copy-dashboard\Backend && npm run dev:auth"
start "BACKEND: Smart Office" cmd /k "cd /d d:\copy-dashboard\Backend && npm run dev:surat"
start "BACKEND: Performance" cmd /k "cd /d d:\copy-dashboard\Backend && npm run dev:performance"
start "BACKEND: Planning" cmd /k "cd /d d:\copy-dashboard\Backend && npm run dev:planning"
start "BACKEND: System & AI" cmd /k "cd /d d:\copy-dashboard\Backend && npm run dev:system"

:: 2. Frontend (Dashboard)
start "FRONTEND: Dashboard" cmd /k "cd /d d:\copy-dashboard\Frontend && npm run dev"

:: 3. Nayaxa Engine (Standalone)
start "NAYAXA: Backend" cmd /k "cd /d d:\nayaxa-engine\Backend && npm run dev"
start "NAYAXA: Frontend" cmd /k "cd /d d:\nayaxa-engine\Frontend && npm run dev"

echo.
echo Semua modul sedang berjalan di jendela terpisah (8 terminal).
echo Anda bisa memantau eror di masing-masing jendela secara mandiri.
