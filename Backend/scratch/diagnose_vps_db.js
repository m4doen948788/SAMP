const pool = require('../src/config/db');

async function diagnose() {
    try {
        console.log("=== 1. DATABASE VERSION ===");
        const [ver] = await pool.query("SELECT VERSION() as version");
        console.log(`Database Version: ${ver[0].version}`);

        console.log("\n=== 2. TABLE CHECK ===");
        const tablesToCheck = ['surat', 'surat_approvals', 'kegiatan_harian_pegawai', 'master_bidang_instansi', 'users', 'profil_pegawai'];
        for (const table of tablesToCheck) {
            try {
                await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
                console.log(`✅ Table '${table}' exists.`);
            } catch (e) {
                console.log(`❌ Table '${table}' DOES NOT exist or error: ${e.message}`);
            }
        }

        console.log("\n=== 3. RUNNING FULL GETALL QUERY ===");
        const query = `
            SELECT s.*, d.path as file_path, d.nama_file, b.nama_bidang, b.singkatan as singkatan_bidang, 
            COALESCE(md_dir.dokumen, md_temp.dokumen) as jenis_surat_nama,
            pp.nama_lengkap as nama_pengusul,
            pp_creator.nama_lengkap as creator_nama,
            s.created_at,
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
            ) as tematik_terkait,
            (
                SELECT GROUP_CONCAT(DISTINCT dt.tematik_id SEPARATOR ',')
                FROM dokumen_tematik dt
                WHERE dt.dokumen_id = s.dokumen_id AND dt.kegiatan_id = 0
            ) as tematik_ids,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'id', sa.id,
                    'role', sa.role, 
                    'status', sa.status, 
                    'reason', sa.reason, 
                    'urutan', sa.urutan,
                    'approver_name', pp_sa.nama_lengkap,
                    'logbook_status', (
                        SELECT khp.nama_kegiatan 
                        FROM kegiatan_harian_pegawai khp 
                        WHERE khp.profil_pegawai_id = pp_sa.id 
                          AND khp.tanggal = CURRENT_DATE 
                          AND khp.tipe_kegiatan = 'C' 
                        LIMIT 1
                    )
                ))
                FROM surat_approvals sa
                LEFT JOIN users u_sa ON sa.approver_id = u_sa.id
                LEFT JOIN profil_pegawai pp_sa ON u_sa.profil_pegawai_id = pp_sa.id
                WHERE sa.surat_id = s.id
                ORDER BY sa.urutan DESC
            ) as approval_chain,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', h.id,
                        'aksi', h.aksi,
                        'keterangan', h.keterangan,
                        'created_at', h.created_at,
                        'user_nama', u_h.nama_lengkap,
                        'user_bidang', COALESCE(b_h.singkatan, b2_h.singkatan, b_h.nama_bidang, b2_h.nama_bidang)
                    )
                )
                FROM surat_edit_history h
                LEFT JOIN users usr_h ON h.user_id = usr_h.id
                LEFT JOIN profil_pegawai u_h ON usr_h.profil_pegawai_id = u_h.id
                LEFT JOIN master_bidang_instansi b_h ON u_h.bidang_id = b_h.id
                LEFT JOIN master_bidang b2_h ON u_h.bidang_id = b2_h.id
                WHERE h.surat_id = s.id
            ) as edit_history
            FROM surat s
            LEFT JOIN dokumen_upload d ON s.dokumen_id = d.id
            LEFT JOIN master_bidang_instansi b ON s.bidang_id = b.id
            LEFT JOIN master_dokumen md_dir ON (s.tipe_surat = 'masuk' AND s.jenis_surat_id = md_dir.id)
            LEFT JOIN surat_templates st ON (s.tipe_surat != 'masuk' AND s.jenis_surat_id = st.id)
            LEFT JOIN master_dokumen md_temp ON st.master_dokumen_id = md_temp.id
            LEFT JOIN profil_pegawai pp ON s.employee_id = pp.id
            LEFT JOIN users u_creator ON s.created_by = u_creator.id
            LEFT JOIN profil_pegawai pp_creator ON u_creator.profil_pegawai_id = pp_creator.id
            WHERE s.instansi_id = 2
        `;
        const [rows] = await pool.query(query);
        console.log(`✅ Success! Query returned ${rows.length} rows.`);
    } catch (e) {
        console.log("❌ QUERY FAILED!");
        console.error(e);
    } finally {
        process.exit();
    }
}

diagnose();
