const pool = require('./config/db');

async function refactorCodes() {
    try {
        console.log('--- Refactoring Program Codes ---');
        const [programs] = await pool.query('SELECT id, kode_program FROM master_program');
        for (const p of programs) {
            if (p.kode_program.includes('.')) {
                const parts = p.kode_program.split('.');
                const newCode = parts[parts.length - 1];
                await pool.query('UPDATE master_program SET kode_program = ? WHERE id = ?', [newCode, p.id]);
                console.log(`Updated Program ID ${p.id}: ${p.kode_program} -> ${newCode}`);
            }
        }

        console.log('--- Refactoring Kegiatan Codes ---');
        const [kegiatans] = await pool.query('SELECT id, kode_kegiatan FROM master_kegiatan');
        for (const k of kegiatans) {
            if (k.kode_kegiatan.includes('.')) {
                const parts = k.kode_kegiatan.split('.');
                if (parts.length >= 2) {
                    const newCode = parts.slice(-2).join('.'); // e.g. "2.01" from "1.01.01.2.01"
                    await pool.query('UPDATE master_kegiatan SET kode_kegiatan = ? WHERE id = ?', [newCode, k.id]);
                    console.log(`Updated Kegiatan ID ${k.id}: ${k.kode_kegiatan} -> ${newCode}`);
                }
            }
        }

        console.log('--- Refactoring Sub-Kegiatan Codes ---');
        const [subKegiatans] = await pool.query('SELECT id, kode_sub_kegiatan FROM master_sub_kegiatan');
        for (const sk of subKegiatans) {
            if (sk.kode_sub_kegiatan.includes('.')) {
                const parts = sk.kode_sub_kegiatan.split('.');
                const newCode = parts[parts.length - 1];
                await pool.query('UPDATE master_sub_kegiatan SET kode_sub_kegiatan = ? WHERE id = ?', [newCode, sk.id]);
                console.log(`Updated Sub-Kegiatan ID ${sk.id}: ${sk.kode_sub_kegiatan} -> ${newCode}`);
            }
        }

        console.log('Refactoring completed successfully.');
    } catch (err) {
        console.error('Refactoring failed:', err.message);
    } finally {
        process.exit();
    }
}

refactorCodes();
