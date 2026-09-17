const pool = require('./db');

// Standard mapping for common titles
const titleMap = {
    // GELAR DEPAN
    'h': 'H.',
    'hj': 'Hj.',
    'dr': 'Dr.',
    'ir': 'Ir.',
    'prof': 'Prof.',

    // GELAR BELAKANG
    'se': 'S.E.',
    'st': 'S.T.',
    'st.': 'S.T.',
    'mm': 'M.M.',
    'mm.': 'M.M.',
    'msi': 'M.Si',
    'm.si.': 'M.Si',
    'm.si': 'M.Si',
    'm.sc': 'M.Sc',
    'm.sc.': 'M.Sc',
    'mba': 'M.B.A.',
    'skm': 'S.K.M.',
    'skm.': 'S.K.M.',
    'sak': 'S.Ak.',
    'sh': 'S.H.',
    'mh': 'M.H.',
    'ss': 'S.S.',
    'skep': 'S.Kep.',
    'spd': 'S.Pd.',
    'mpd': 'M.Pd.',
    'sap': 'S.A.P.',
    's.a.p.': 'S.A.P.',
    'map': 'M.A.P.',
    'm.a.p.': 'M.A.P.',
    'sos': 'S.Sos',
    's.sos': 'S.Sos',
    's.sos.': 'S.Sos',
    'ip': 'S.IP',
    'sip': 'S.IP',
    's.ip': 'S.IP',
    'ikom': 'S.I.Kom.',
    'skom': 'S.Kom',
    's.kom': 'S.Kom',
    's.kom.': 'S.Kom',
    'shut': 'S.Hut',
    's.hut': 'S.Hut',
    'spi': 'S.Pi',
    's.pi.': 'S.Pi',
    'sp': 'S.P.',
    's.p.': 'S.P.',
    'sttp': 'S.STP',
    'sstp': 'S.STP',
    'stp': 'S.TP',
    's.tp': 'S.TP',
    'spsi': 'S.Psi',
    's.psi': 'S.Psi',
    'ssi': 'S.Si',
    's.si': 'S.Si',
    'sm': 'S.M.',
    's.m.': 'S.M.',
    'mpwk': 'M.P.W.K.',
    's.p.w.k.': 'S.P.W.K.',
    'spwk': 'S.P.W.K.',
    'trip': 'S.Tr.IP',
    's.tr.ip': 'S.Tr.IP',
    'amd': 'A.Md.',
    'a.md.': 'A.Md.',
    'a.md': 'A.Md.',
    'ipm': 'IPM',
    'me': 'M.E.',
    'm.e.': 'M.E.',
    'm.e': 'M.E.',
    'mp': 'M.P.',
    'm.p.': 'M.P.',
    'm.p': 'M.P.',
    'set': 'S.E.T.',
    's.e.t': 'S.E.T.',
    's hut': 'S.Hut',
    's. hut': 'S.Hut',
    's. kom.': 'S.Kom',
    's. kom': 'S.Kom',
    'm.kom.': 'M.Kom',
    'm.kom': 'M.Kom',
    'mpp.': 'MPP',
    'mpp': 'MPP'
};

function standardizePart(part) {
    if (!part) return '';
    let clean = part.trim().toLowerCase();
    // Remove dots for uniform lookup, but keep them for some mapping
    let lookup = clean.replace(/\./g, '');
    
    // Check original with dots first (for cases like "S.Si" vs "Si")
    if (titleMap[clean]) return titleMap[clean];
    // Check without dots
    if (titleMap[lookup]) return titleMap[lookup];
    
    // If no mapping, capitalize first letter as fallback
    return part.trim().split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
}

function cleanGelarBelakang(full) {
    if (!full) return null;
    return full.split(',')
        .map(p => standardizePart(p))
        .filter(p => p !== '')
        .join(', ');
}

function cleanGelarDepan(full) {
    if (!full) return null;
    return full.split(' ')
        .map(p => standardizePart(p))
        .filter(p => p !== '')
        .join(' ');
}

async function run() {
    try {
        console.log('--- STARTING TITLE STANDARDIZATION ---');
        
        const [rows] = await pool.query('SELECT id, gelar_depan, nama, gelar_belakang FROM profil_pegawai');
        
        for (const row of rows) {
            const newGDepan = cleanGelarDepan(row.gelar_depan);
            const newGBelakang = cleanGelarBelakang(row.gelar_belakang);
            
            // Re-calculate full name for the DB cache
            let fullName = row.nama || '';
            if (newGDepan) fullName = `${newGDepan} ${fullName}`;
            if (newGBelakang) fullName = `${fullName}, ${newGBelakang}`;
            
            console.log(`Updating ${row.id}: [${row.gelar_depan}] [${row.nama}] [${row.gelar_belakang}]`);
            console.log(`      -> [${newGDepan}] [${row.nama}] [${newGBelakang}]`);
            
            await pool.query(
                'UPDATE profil_pegawai SET gelar_depan = ?, gelar_belakang = ?, nama_lengkap = ? WHERE id = ?',
                [newGDepan || null, newGBelakang || null, fullName || null, row.id]
            );
        }
        
        console.log('\n--- STANDARDIZATION COMPLETED ---');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
