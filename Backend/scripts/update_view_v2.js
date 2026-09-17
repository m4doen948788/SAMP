const pool = require('./src/config/db');
const sql = `
CREATE OR REPLACE VIEW v_rekap_kegiatan_harian AS
SELECT 
    MIN(k.id) AS id,
    k.profil_pegawai_id,
    p.nama_lengkap,
    p.instansi_id,
    k.tanggal,
    CASE 
        WHEN k.tipe_kegiatan IN ('C', 'S', 'DL', 'DLB') THEN 'Full Day'
        ELSE GROUP_CONCAT(DISTINCT k.sesi ORDER BY k.sesi ASC SEPARATOR ', ')
    END AS sesi,
    k.tipe_kegiatan AS kode_tipe,
    GROUP_CONCAT(DISTINCT k.nama_kegiatan SEPARATOR '; ') AS nama_kegiatan,
    GROUP_CONCAT(DISTINCT k.keterangan SEPARATOR '; ') AS keterangan,
    CASE 
        WHEN k.tipe_kegiatan = 'DLB' THEN 'DL Luar Bidang / Undangan Luar' 
        WHEN k.tipe_kegiatan = 'DL' THEN 'Dinas Luar' 
        WHEN k.tipe_kegiatan = 'RM' THEN 'Rapat Internal' 
        WHEN k.tipe_kegiatan = 'RLB' THEN 'Rapat Luar Bidang' 
        WHEN k.tipe_kegiatan = 'S' THEN 'Sakit' 
        WHEN k.tipe_kegiatan = 'C' THEN 'Cuti' 
        ELSE k.tipe_kegiatan 
    END AS deskripsi_tipe,
    1.0 AS bobot_kegiatan
FROM kegiatan_harian_pegawai k
JOIN profil_pegawai p ON k.profil_pegawai_id = p.id
GROUP BY k.profil_pegawai_id, k.tanggal, k.tipe_kegiatan, k.id_kegiatan_eksternal
`;

async function run() {
    try {
        await pool.query(sql);
        console.log('View v_rekap_kegiatan_harian updated with Full Day label');
        process.exit(0);
    } catch (err) {
        console.error('Error updating view:', err);
        process.exit(1);
    }
}
run();
