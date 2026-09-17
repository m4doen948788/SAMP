const pool = require('./src/config/db');

async function updateTipe() {
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Check/Update Rapat Luar Bidang children
        const [rlbRows] = await connection.query("SELECT id FROM master_tipe_kegiatan WHERE nama = 'Rapat Luar Bidang' LIMIT 1");
        if (rlbRows.length > 0) {
            const rlbId = rlbRows[0].id;
            
            // Check if sub already exists
            const [subRows] = await connection.query("SELECT id FROM master_tipe_kegiatan WHERE parent_id = ?", [rlbId]);
            
            if (subRows.length === 0) {
                console.log("Adding sub activities for Rapat Luar Bidang...");
                await connection.query(
                    "INSERT INTO master_tipe_kegiatan (nama, parent_id, kode, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ['Rapat Luar Bidang Online', rlbId, 'RLB ol', 'bg-ppm-slate', 'text-white', 0, 1, 1]
                );
                await connection.query(
                    "INSERT INTO master_tipe_kegiatan (nama, parent_id, kode, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ['Rapat Luar Bidang Offline', rlbId, 'RLB of', 'bg-ppm-slate', 'text-white', 0, 1, 2]
                );
            } else {
                console.log("Sub activities for Rapat Luar Bidang already exist.");
            }
        } else {
            // Create Rapat Luar Bidang first?
            console.log("Rapat Luar Bidang not found. Creating parent and children...");
            const [res] = await connection.query(
                "INSERT INTO master_tipe_kegiatan (nama, parent_id, kode, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ['Rapat Luar Bidang', null, 'RLB', 'bg-fuchsia-600', 'text-white', 0, 1, 7]
            );
            const newId = res.insertId;
            await connection.query(
                "INSERT INTO master_tipe_kegiatan (nama, parent_id, kode, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ['Rapat Luar Bidang Online', newId, 'RLB ol', 'bg-ppm-slate', 'text-white', 0, 1, 1]
            );
            await connection.query(
                "INSERT INTO master_tipe_kegiatan (nama, parent_id, kode, warna, warna_teks, is_jumlah_full, is_rapat, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ['Rapat Luar Bidang Offline', newId, 'RLB of', 'bg-ppm-slate', 'text-white', 0, 1, 2]
            );
        }

        await connection.commit();
        console.log("Update completed.");
        process.exit(0);
    } catch (err) {
        console.error("Update failed:", err);
        process.exit(1);
    }
}
updateTipe();
