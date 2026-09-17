const mysql = require('mysql2/promise');
require('dotenv').config({ path: './Backend/.env' });

async function debugGetAll() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // Mock user from what we know
        const user = { instansi_id: 1, tipe_user_id: 1, bidang_id: 1 }; 
        const params = [user.instansi_id];
        
        // Print the query to check for syntax
        console.log('Testing query for instansi_id:', user.instansi_id);

        const [rows] = await pool.query(`
            SELECT s.*, d.path as file_path, d.nama_file, b.nama_bidang, b.singkatan as singkatan_bidang, md.dokumen as jenis_surat_nama,
            (
                SELECT k.nama_kegiatan 
                FROM kegiatan_manajemen k
                LEFT JOIN kegiatan_manajemen_dokumen kd ON k.id = kd.kegiatan_id
                WHERE k.is_deleted = 0 AND (
                    kd.dokumen_id = s.dokumen_id OR 
                    k.surat_undangan_masuk_id = s.dokumen_id OR 
                    k.surat_undangan_keluar_id = s.dokumen_id OR 
                    k.bahan_desk_id = s.dokumen_id OR 
                    k.paparan_id = s.dokumen_id
                )
                LIMIT 1
            ) as nama_kegiatan_terkait,
            (
                SELECT k.id 
                FROM kegiatan_manajemen k
                LEFT JOIN kegiatan_manajemen_dokumen kd ON k.id = kd.kegiatan_id
                WHERE k.is_deleted = 0 AND (
                    kd.dokumen_id = s.dokumen_id OR 
                    k.surat_undangan_masuk_id = s.dokumen_id OR 
                    k.surat_undangan_keluar_id = s.dokumen_id OR 
                    k.bahan_desk_id = s.dokumen_id OR 
                    k.paparan_id = s.dokumen_id
                )
                LIMIT 1
            ) as kegiatan_id_terkait,
            (
                SELECT GROUP_CONCAT(DISTINCT mt.nama_tematik SEPARATOR ', ')
                FROM dokumen_tematik dt
                JOIN master_tematik mt ON dt.tematik_id = mt.id
                WHERE dt.dokumen_id = s.dokumen_id
            ) as tematik_terkait
            FROM surat s
            LEFT JOIN dokumen_upload d ON s.dokumen_id = d.id
            LEFT JOIN master_bidang_instansi b ON s.bidang_id = b.id
            LEFT JOIN master_dokumen md ON s.jenis_surat_id = md.id
            WHERE s.instansi_id = ?
            ORDER BY s.tanggal_surat DESC, s.id DESC
        `, params);

        console.log('Result Count:', rows.length);
        if (rows.length > 0) {
            console.log('First Row Sample:', rows[0]);
        }
        
        // Also check if ANY surat exists
        const [allSurat] = await pool.query('SELECT count(*) as total FROM surat');
        console.log('TOTAL SURAT IN DB:', allSurat[0].total);

    } catch (err) {
        console.error('SQL Error:', err);
    } finally {
        await pool.end();
    }
}

debugGetAll();
