const pool = require('./src/config/db');

async function descTables() {
    const tables = [
        'master_urusan',
        'master_bidang_urusan',
        'master_program',
        'master_kegiatan',
        'master_sub_kegiatan'
    ];
    for (const table of tables) {
        console.log('\\n--- ' + table + ' ---');
        try {
            const [rows] = await pool.query('DESCRIBE ' + table);
            console.table(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key })));
        } catch (e) {
            console.error('Table ' + table + ' not found');
        }
    }
    process.exit(0);
}
descTables();
