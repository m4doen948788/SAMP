const pool = require('../Backend/src/config/db');

async function investigateIqmal() {
    try {
        const [rows] = await pool.query("SELECT id, nama_lengkap, bidang_id FROM profil_pegawai WHERE nama_lengkap LIKE '%Iqmal%'");
        console.log('--- PROFIL PEGAWAI (Iqmal) ---');
        console.log(JSON.stringify(rows, null, 2));

        if (rows.length > 0) {
            const profilId = rows[0].id;
            const bidangId = rows[0].bidang_id;

            if (bidangId) {
                const [bidangRows] = await pool.query("SELECT id, nama_bidang FROM master_bidang_instansi WHERE id = ?", [bidangId]);
                console.log('\n--- MASTER BIDANG ---');
                console.log(JSON.stringify(bidangRows, null, 2));
            } else {
                console.log('\n❌ Bidang ID is NULL for this employee.');
            }

            // Check activities and documents
            const [activities] = await pool.query("SELECT id, tanggal, sesi, tipe_kegiatan, keterangan FROM kegiatan_harian_pegawai WHERE profil_pegawai_id = ? ORDER BY tanggal DESC LIMIT 5", [profilId]);
            console.log('\n--- KEGIATAN TERAKHIR ---');
            console.log(JSON.stringify(activities, null, 2));

            // Check if there are any documents linked to these activities
            // We need to know the table that links activities to documents.
            // Based on the schema I saw earlier:
            // kegiatan_harian_pegawai doesn't seem to have a document_id directly?
            // Wait, let's check the schema again.
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

investigateIqmal();
