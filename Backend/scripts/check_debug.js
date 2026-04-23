const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    // Check for views
    const [views] = await p.query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
    console.log('Database Views:', views.length ? JSON.stringify(views) : 'none');

    // Check all master_data_config entries for user_id references
    const [all] = await p.query('SELECT id, nama_tabel, kolom FROM master_data_config');
    console.log('\nChecking master_data_config for user_id references:');
    all.forEach(r => {
        const k = typeof r.kolom === 'string' ? JSON.parse(r.kolom) : r.kolom;
        const hasUserId = k.some(c => c.nama_db === 'user_id');
        if (hasUserId) {
            console.log(`  ⚠️  FOUND user_id in: ${r.nama_tabel} (id: ${r.id})`);
        }
    });

    // Check profil_pegawai actual columns
    const [cols] = await p.query('SHOW COLUMNS FROM profil_pegawai');
    console.log('\nActual profil_pegawai columns:');
    cols.forEach(c => console.log(`  - ${c.Field}`));

    // Check if there are duplicate config entries
    console.log('\nAll config entries:');
    all.forEach(r => console.log(`  id:${r.id} => ${r.nama_tabel}`));

    console.log('\nDone.');
    await p.end();
})();
