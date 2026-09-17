const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyPermissions() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('--- Verifying Edit Permission Roles ---');

    // Expected IDs for roles:
    // Superadmin: 1
    // Admin Bidang: 4
    // User: 3

    const [allRoles] = await conn.query('SELECT tipe_user FROM master_tipe_user');
    console.log('Available Roles:', allRoles.map(r => r.tipe_user).join(', '));

    console.log('\n--- Logic Verification ---');

    const checkAccess = (user) => {
        const isSuperAdmin = user.tipe_user_id === 1;
        const isKepegawaianAdmin = user.jabatan_nama === 'Kepala Sub Bagian' && user.sub_bidang_nama === 'Umum dan Kepegawaian';
        return isSuperAdmin || isKepegawaianAdmin;
    };

    const testUsers = [
        { name: 'Superadmin', tipe_user_id: 1, jabatan_nama: 'Kepala Badan', sub_bidang_nama: '-' },
        { name: 'Admin Bidang (Restricted)', tipe_user_id: 4, jabatan_nama: 'Staf', sub_bidang_nama: 'Keuangan' },
        { name: 'Kepala Sub Bagian Umum & Kepegawaian (Allowed)', tipe_user_id: 6, jabatan_nama: 'Kepala Sub Bagian', sub_bidang_nama: 'Umum dan Kepegawaian' },
        { name: 'Other Kepala Sub Bagian (Restricted)', tipe_user_id: 6, jabatan_nama: 'Kepala Sub Bagian', sub_bidang_nama: 'Perencanaan' }
    ];

    testUsers.forEach(u => {
        const allowed = checkAccess(u);
        console.log(`User: ${u.name.padEnd(45)} | Access: ${allowed ? '✅ ALLOWED' : '❌ RESTRICTED'}`);
    });

    await conn.end();
}

verifyPermissions().catch(console.error);
