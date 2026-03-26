const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const username = 'andin';
        console.log(`Testing login for user: ${username}`);
        
        const query = `
            SELECT 
                u.id, u.username, u.password, u.profil_pegawai_id,
                pp.nama_lengkap, pp.email, pp.is_active,
                pp.tipe_user_id, pp.instansi_id, pp.jabatan_id, pp.bidang_id, pp.sub_bidang_id
            FROM users u
            LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE u.username = ? OR pp.email = ?
        `;

        const [rows] = await pool.query(query, [username, username]);
        console.log('User found:', rows.length > 0);
        
        if (rows.length > 0) {
            const user = rows[0];
            console.log('User Details:', {
                id: user.id,
                username: user.username,
                is_active: user.is_active,
                profil_pegawai_id: user.profil_pegawai_id
            });
            
            // Check password manually
            const isMatch = await bcrypt.compare('andin123', user.password); // Common test password if I remember correctly
            console.log('Password match with "andin123":', isMatch);
        }

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await pool.end();
    }
})();
