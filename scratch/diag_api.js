const pool = require('../Backend/src/config/db');

async function diag() {
    try {
        // Mock user (assuming id 1, instansi 2, role 2 as per previous check_users logs)
        const mockUser = {
            id: 1,
            instansi_id: 2,
            tipe_user_id: 2, // Admin Instansi
            bidang_id: 2
        };

        const instansi_id = mockUser.instansi_id;
        const userRole = mockUser.tipe_user_id;
        const isSuperAdmin = userRole === 1;
        const isPimpinan = [2, 5].includes(userRole);

        console.log(`--- Diag for User: ID=${mockUser.id}, Instansi=${mockUser.instansi_id}, Role=${mockUser.tipe_user_id} ---`);

        async function runQuery(type, bidang_id) {
            let query = `
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
                    SELECT GROUP_CONCAT(DISTINCT mt.nama SEPARATOR ', ')
                    FROM dokumen_tematik dt
                    JOIN master_tematik mt ON dt.tematik_id = mt.id
                    WHERE dt.dokumen_id = s.dokumen_id
                ) as tematik_terkait
                FROM surat s
                LEFT JOIN dokumen_upload d ON s.dokumen_id = d.id
                LEFT JOIN master_bidang_instansi b ON s.bidang_id = b.id
                LEFT JOIN master_dokumen md ON s.jenis_surat_id = md.id
                WHERE s.instansi_id = ?
            `;
            const params = [instansi_id];

            if (type) {
                query += ' AND s.tipe_surat = ?';
                params.push(type);
            }

            if (!isSuperAdmin && !isPimpinan) {
                if (bidang_id) {
                    query += ' AND s.bidang_id = ?';
                    params.push(bidang_id);
                } else {
                    query += ' AND s.bidang_id = ?';
                    params.push(mockUser.bidang_id);
                }
            } else if (bidang_id) {
                query += ' AND s.bidang_id = ?';
                params.push(bidang_id);
            }

            query += ' ORDER BY s.tanggal_surat DESC, s.id DESC';
            const [rows] = await pool.query(query, params);
            return rows;
        }

        const resAll = await runQuery(undefined, undefined);
        console.log('Result for getAll():', resAll.length);

        const resMasuk = await runQuery('masuk', undefined);
        console.log('Result for getAll({ type: "masuk" }):', resMasuk.length);

        // Check if there are any records with bidang_id NULL
        const [nullBidang] = await pool.query('SELECT COUNT(*) as count FROM surat WHERE bidang_id IS NULL AND instansi_id = ?', [instansi_id]);
        console.log('Surat with NULL bidang_id:', nullBidang[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
diag();
