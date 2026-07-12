const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'dashboard_ppm',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const docIds = [58, 59, 67, 99];
        
        console.log('=== CHECKING DOKUMEN EDIT HISTORY FOR IDs: ' + docIds.join(', ') + ' ===');
        
        const [historyRows] = await pool.query(`
            SELECT h.*, u.username, pp.nama_lengkap
            FROM dokumen_edit_history h
            LEFT JOIN users u ON h.user_id = u.id
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE h.dokumen_id IN (?)
            ORDER BY h.id DESC
        `, [docIds]);

        if (historyRows.length === 0) {
            console.log('No history records found in database for these documents.');
        } else {
            for (const row of historyRows) {
                console.log({
                    id: row.id,
                    dokumen_id: row.dokumen_id,
                    aksi: row.aksi,
                    keterangan: row.keterangan,
                    aktor: row.nama_lengkap || row.username || 'System/Tidak Diketahui',
                    waktu: row.created_at || row.timestamp || 'N/A'
                });
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
