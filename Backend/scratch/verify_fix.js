const pool = require('../src/config/db');

async function testSync() {
    console.log('--- Testing Logbook Sync Fix ---');
    
    const connection = await pool.getConnection();
    try {
        // 1. Setup Dummy Activity
        const dummyActivityId = 999999; // Using a high ID to avoid conflicts
        const officerId = 1; // Assuming officer ID 1 exists
        const date1 = '2026-10-10';
        const date2 = '2026-10-11';

        console.log(`Setting up test for activity ${dummyActivityId} on ${date1}`);

        // Cleanup any previous test data
        await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [dummyActivityId]);
        await connection.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [dummyActivityId]);

        // Insert dummy activity
        await connection.query(`
            INSERT INTO kegiatan_manajemen (id, tanggal, nama_kegiatan, petugas_ids, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [dummyActivityId, date1, 'Test Activity Fix', officerId.toString(), 1]);

        const syncToLogbook = async (actId) => {
            const [kegData] = await connection.query(`
                SELECT k.*, DATE_FORMAT(k.tanggal, '%Y-%m-%d') as tanggal_str, 'RM' as tipe_kode 
                FROM kegiatan_manajemen k
                WHERE k.id = ?
            `, [actId]);
            const keg = kegData[0];
            const pIds = [officerId];
            
            // THE FIX:
            await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [actId]);
            
            for (const pId of pIds) {
                await connection.query(`
                    INSERT INTO kegiatan_harian_pegawai (
                        profil_pegawai_id, tanggal, sesi, tipe_kegiatan, 
                        id_kegiatan_eksternal, nama_kegiatan, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        id_kegiatan_eksternal = VALUES(id_kegiatan_eksternal),
                        nama_kegiatan = VALUES(nama_kegiatan)
                `, [pId, keg.tanggal_str, 'Pagi', 'RM', actId, keg.nama_kegiatan, 1, 1]);
            }
        };

        const formatDate = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        // First Sync
        console.log('Running first sync...');
        await syncToLogbook(dummyActivityId);
        
        let [rows] = await connection.query('SELECT * FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [dummyActivityId]);
        console.log(`Found ${rows.length} records. Dates: ${rows.map(r => formatDate(r.tanggal)).join(', ')}`);

        // Change Date
        console.log(`Changing date to ${date2}...`);
        await connection.query('UPDATE kegiatan_manajemen SET tanggal = ? WHERE id = ?', [date2, dummyActivityId]);

        // Second Sync
        console.log('Running second sync...');
        await syncToLogbook(dummyActivityId);

        [rows] = await connection.query('SELECT * FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [dummyActivityId]);
        console.log(`Found ${rows.length} records. Dates: ${rows.map(r => formatDate(r.tanggal)).join(', ')}`);

        if (rows.length === 1 && formatDate(rows[0].tanggal) === date2) {
            console.log('✅ SUCCESS: Ghost entry removed, only new date entry exists.');
        } else {
            console.log('❌ FAILURE: Unexpected number of records or incorrect date.');
        }

        // Cleanup
        await connection.query('DELETE FROM kegiatan_harian_pegawai WHERE id_kegiatan_eksternal = ?', [dummyActivityId]);
        await connection.query('DELETE FROM kegiatan_manajemen WHERE id = ?', [dummyActivityId]);

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

testSync();
