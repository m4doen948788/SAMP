const pool = require('../Backend/src/config/db');

async function testScoring() {
    try {
        const month = 4;
        const year = 2026;
        const instansi_id = 2;

        const [scores] = await pool.query(`
            SELECT 
                p.id, p.nama_lengkap, b.nama_bidang, j.jabatan,
                (
                    COUNT(DISTINCT CASE WHEN UPPER(k.tipe_kegiatan) IN ('DLB', 'DL', 'S', 'C', 'CUTI', 'SAKIT') THEN k.tanggal END) +
                    COUNT(CASE WHEN k.tipe_kegiatan IS NOT NULL AND UPPER(k.tipe_kegiatan) NOT IN ('DLB', 'DL', 'S', 'C', 'CUTI', 'SAKIT') THEN k.id END)
                ) as total_kegiatan,
                SUM(CASE WHEN k.tipe_kegiatan LIKE 'RM%' THEN 2 ELSE 1 END) as weighted_score
            FROM profil_pegawai p
            LEFT JOIN kegiatan_harian_pegawai k ON p.id = k.profil_pegawai_id 
                AND (k.tanggal IS NULL OR (MONTH(k.tanggal) = ? AND YEAR(k.tanggal) = ?))
            LEFT JOIN master_bidang_instansi b ON p.bidang_id = b.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            WHERE p.instansi_id = ? AND p.is_active = 1
            GROUP BY p.id, p.nama_lengkap, b.nama_bidang, j.jabatan
            ORDER BY weighted_score DESC, total_kegiatan DESC
        `, [month, year, instansi_id]);

        console.log('Result for Iqmal:', scores.find(s => s.nama_lengkap.includes('Iqmal')));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testScoring();
