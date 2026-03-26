const pool = require('./db');

async function analyze() {
    try {
        const [dRows] = await pool.query('SELECT DISTINCT gelar_depan FROM profil_pegawai WHERE gelar_depan IS NOT NULL');
        const [bRows] = await pool.query('SELECT DISTINCT gelar_belakang FROM profil_pegawai WHERE gelar_belakang IS NOT NULL');
        
        console.log('-- PREFIX TITLES --');
        console.log(dRows.map(r => r.gelar_depan).join(' | '));
        
        console.log('\n-- SUFFIX TITLES --');
        console.log(bRows.map(r => r.gelar_belakang).join(' | '));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

analyze();
