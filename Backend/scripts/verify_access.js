const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function run() {
    console.log('--- Verification Hierarchical Access Start ---');
    console.log('DB Config present:', !!process.env.DB_HOST);

    let conn;
    try {
        console.log('Connecting...');
        conn = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        async function checkFilter(roleId, instansiId, bidangId, label) {
            console.log(`\nTesting: ${label} (Role ID: ${roleId}, Instansi ID: ${instansiId}, Bidang ID: ${bidangId})`);

            const isSuperAdmin = roleId === 1;
            const isDivisionLevel = [3, 4, 6].includes(roleId);

            let query = 'SELECT COUNT(*) as count FROM profil_pegawai pp WHERE 1=1';
            const params = [];

            if (!isSuperAdmin) {
                query += ' AND pp.instansi_id = ?';
                params.push(instansiId);

                if (isDivisionLevel && bidangId) {
                    query += ' AND pp.bidang_id = ?';
                    params.push(bidangId);
                }
            }

            const [rows] = await conn.query(query, params);
            console.log(`> Result: Found ${rows[0].count} employees accessible.`);

            const [others] = await conn.query('SELECT pp.id, pp.instansi_id, pp.bidang_id FROM profil_pegawai pp WHERE pp.instansi_id = ? AND (pp.bidang_id != ? OR pp.bidang_id IS NULL) LIMIT 1', [instansiId, bidangId]);
            if (others.length > 0) {
                const target = others[0];
                const allowed = isSuperAdmin || (!isDivisionLevel && target.instansi_id === instansiId) || (isDivisionLevel && target.bidang_id === bidangId);
                console.log(`> Access to Employee ID ${target.id} (Another Bidang ${target.bidang_id}): ${allowed ? 'ALLOWED ✅' : 'BLOCKED ❌'}`);
            }
        }

        const [totalRows] = await conn.query('SELECT COUNT(*) as count FROM profil_pegawai');
        console.log(`System Total Employees: ${totalRows[0].count}`);

        await checkFilter(1, null, null, 'Superadmin');

        const [instansiRows] = await conn.query('SELECT instansi_id, COUNT(DISTINCT bidang_id) as bidang_count, COUNT(*) as emp_count FROM profil_pegawai WHERE instansi_id IS NOT NULL AND bidang_id IS NOT NULL GROUP BY instansi_id HAVING bidang_count > 1 LIMIT 1');

        if (instansiRows.length > 0) {
            const { instansi_id } = instansiRows[0];
            await checkFilter(2, instansi_id, null, 'Admin Instansi');

            const [bidangRows] = await conn.query('SELECT bidang_id FROM profil_pegawai WHERE instansi_id = ? AND bidang_id IS NOT NULL GROUP BY bidang_id LIMIT 1', [instansi_id]);
            if (bidangRows.length > 0) {
                const { bidang_id } = bidangRows[0];
                await checkFilter(4, instansi_id, bidang_id, 'Admin Bidang');
            }
        } else {
            console.log('Could not find suitable data for cross-bidang testing.');
        }

    } catch (e) {
        console.error('FATAL ERROR:', e);
    } finally {
        if (conn) await conn.end();
        console.log('\n--- Verification Hierarchical Access End ---');
    }
}

run();
