/**
 * Diagnostic Script: Analyze Syofiatin's logbook entries on VPS database
 * Run on VPS: node Backend/scripts/diagnose_syofiatin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

async function run() {
    console.log('--- DIAGNOSTIC FOR SYOFIATIN ---');
    try {
        // 1. Get Syofiatin profile
        const [profiles] = await pool.query("SELECT id, nama_lengkap FROM profil_pegawai WHERE nama_lengkap LIKE '%syofiatin%'");
        console.log('Profile found:', profiles);
        if (profiles.length === 0) {
            console.log('No profile found for Syofiatin.');
            return;
        }
        const profilId = profiles[0].id;

        // 2. Get all logbook entries for August 2026
        const [entries] = await pool.query(`
            SELECT id, tanggal, sesi, tipe_kegiatan, id_kegiatan_eksternal, nama_kegiatan, keterangan 
            FROM kegiatan_harian_pegawai 
            WHERE profil_pegawai_id = ? AND tanggal BETWEEN '2026-08-01' AND '2026-08-31'
            ORDER BY tanggal, sesi, id
        `, [profilId]);

        console.log(`\nFound ${entries.length} entries in August 2026:`);
        entries.forEach(e => {
            console.log(JSON.stringify(e));
        });

    } catch (err) {
        console.error('Diagnostic error:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
