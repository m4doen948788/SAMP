const pool = require('../../src/config/db');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
    try {
        console.log('🔄 Memulai Pelacak Migrasi (Migration Tracker)...');
        
        // 1. Buat tabel history jika belum ada
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migration_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Baca folder pending
        const pendingDir = path.join(__dirname, 'pending');
        if (!fs.existsSync(pendingDir)) {
            fs.mkdirSync(pendingDir, { recursive: true });
        }

        const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.js')).sort();
        
        if (files.length === 0) {
            console.log('✅ Tidak ada skrip migrasi baru yang perlu dijalankan.');
            return;
        }

        // 3. Cek mana yang sudah jalan
        const [historyRows] = await pool.query('SELECT filename FROM migration_history');
        const executedFiles = new Set(historyRows.map(r => r.filename));

        let executedCount = 0;

        for (const file of files) {
            if (!executedFiles.has(file)) {
                console.log(`\n⏳ Mengeksekusi migrasi baru: ${file}...`);
                const scriptPath = path.join(pendingDir, file);
                
                try {
                    // Eksekusi sebagai proses terpisah agar tidak bentrok dengan process.exit()
                    // Kita operkan environment yang sama agar koneksi DB aman
                    execSync(`node "${scriptPath}"`, { stdio: 'inherit', env: process.env });
                    
                    // Jika sukses, catat ke database
                    await pool.query('INSERT INTO migration_history (filename) VALUES (?)', [file]);
                    console.log(`✅ Migrasi [${file}] berhasil diselesaikan dan dicatat.`);
                    executedCount++;
                } catch (err) {
                    console.error(`❌ Gagal menjalankan migrasi [${file}]. Selesaikan error sebelum melanjutkan.`);
                    process.exit(1); // Hentikan tracker jika satu skrip gagal
                }
            }
        }

        if (executedCount > 0) {
            console.log(`\n🎉 Selesai! ${executedCount} migrasi baru berhasil dieksekusi.`);
        } else {
            console.log('✅ Semua skrip migrasi sudah pernah dieksekusi sebelumnya.');
        }

    } catch (e) {
        console.error('❌ Terjadi kesalahan sistem pada Migration Tracker:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

run();
