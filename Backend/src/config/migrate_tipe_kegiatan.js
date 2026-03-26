const mysql = require('mysql2/promise');
require('dotenv').config({ path: './Backend/.env' });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Creating master_tipe_kegiatan table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS master_tipe_kegiatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                parent_id INT NULL,
                kode VARCHAR(50) NOT NULL UNIQUE,
                nama VARCHAR(100) NOT NULL,
                warna VARCHAR(50) DEFAULT 'bg-slate-500',
                warna_teks VARCHAR(50) DEFAULT 'text-white',
                is_jumlah_full BOOLEAN DEFAULT FALSE,
                is_rapat BOOLEAN DEFAULT FALSE,
                urutan INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES master_tipe_kegiatan(id) ON DELETE SET NULL
            )
        `);

        console.log('Seeding initial activity types...');
        const initialTypes = [
            { kode: 'C', nama: 'Cuti', warna: 'bg-red-500', warna_teks: 'text-white', is_jumlah_full: true, is_rapat: false, urutan: 1 },
            { kode: 'DL', nama: 'Dinas Luar', warna: 'bg-orange-500', warna_teks: 'text-white', is_jumlah_full: true, is_rapat: false, urutan: 2 },
            { kode: 'S', nama: 'Sakit', warna: 'bg-green-500', warna_teks: 'text-white', is_jumlah_full: true, is_rapat: false, urutan: 3 },
            { kode: 'DLB', nama: 'DL Luar Bidang', warna: 'bg-yellow-500', warna_teks: 'text-slate-800', is_jumlah_full: true, is_rapat: false, urutan: 4 },
            { kode: 'RM', nama: 'Rapat Mamin', warna: 'bg-slate-500', warna_teks: 'text-white', is_jumlah_full: false, is_rapat: true, urutan: 5 },
            { kode: 'RLB', nama: 'Rapat Luar Bidang', warna: 'bg-purple-500', warna_teks: 'text-white', is_jumlah_full: false, is_rapat: true, urutan: 6 },
        ];

        for (const type of initialTypes) {
            await connection.query(
                'INSERT IGNORE INTO master_tipe_kegiatan (kode, nama, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [type.kode, type.nama, type.warna, type.warna_teks, type.is_jumlah_full, type.is_rapat, type.urutan]
            );
        }

        // Fetch RM id to set parents for RM ol/of
        const [rmRows] = await connection.query('SELECT id FROM master_tipe_kegiatan WHERE kode = "RM"');
        if (rmRows.length > 0) {
            const rmId = rmRows[0].id;
            const subTypes = [
                { parent_id: rmId, kode: 'RM ol', nama: 'Online', warna: 'bg-slate-500', warna_teks: 'text-white', is_jumlah_full: false, is_rapat: true, urutan: 1 },
                { parent_id: rmId, kode: 'RM of', nama: 'Offline', warna: 'bg-slate-500', warna_teks: 'text-white', is_jumlah_full: false, is_rapat: true, urutan: 2 },
            ];
            for (const sub of subTypes) {
                await connection.query(
                    'INSERT IGNORE INTO master_tipe_kegiatan (parent_id, kode, nama, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [sub.parent_id, sub.kode, sub.nama, sub.warna, sub.warna_teks, sub.is_jumlah_full, sub.is_rapat, sub.urutan]
                );
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
