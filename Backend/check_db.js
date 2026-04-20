const mysql = require('mysql2/promise');

async function checkDB() {
    const pool = mysql.createPool({
        host: 'kasibah.com',
        user: 'kasibahc_dashboard_ppm',
        password: 'eW7UFcbuRrJmKECk5mNz',
        database: 'kasibahc_dashboard_ppm',
    });

    try {
        console.log('--- Checking Surat Table ---');
        const [rows] = await pool.query('SELECT * FROM surat LIMIT 5');
        console.log('Recent Rows:', rows.length);
        if (rows.length > 0) {
            console.table(rows.map(r => ({id: r.id, nomor: r.nomor_surat, inst: r.instansi_id, type: r.tipe_surat})));
        }

        console.log('--- Checking Columns in master_dokumen ---');
        const [cols] = await pool.query('DESCRIBE master_dokumen');
        console.table(cols.map(c => ({ Field: c.Field })));

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

checkDB();
