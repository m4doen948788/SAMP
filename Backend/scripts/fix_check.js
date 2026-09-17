const pool = require('./src/config/db');

async function fixCheck() {
    console.log('--- Bidangs with no parent_id ---');
    const [broken] = await pool.query('SELECT id, kode_urusan, urusan FROM master_bidang_urusan WHERE parent_id IS NULL LIMIT 10');
    console.table(broken);

    console.log('\n--- Checking if their parent Urusan exists in DB ---');
    // If kode_urusan is '01' (Bidang), it usually belongs to Urusan '1' (first digit).
    // Let's see if my script can find the parent Urusan based on the code.
    if (broken.length > 0) {
        for (const b of broken) {
            const urusanCode = b.kode_urusan ? b.kode_urusan.substring(0, 1) : null;
            if (urusanCode) {
                const [u] = await pool.query('SELECT id, urusan FROM master_urusan WHERE kode_urusan = ?', [urusanCode]);
                console.log('Bidang ' + b.kode_urusan + ' (' + b.urusan + ') -> Urusan ' + urusanCode + ': ' + (u.length > 0 ? u[0].id : 'Not Found'));
            }
        }
    }
    process.exit(0);
}

fixCheck();
