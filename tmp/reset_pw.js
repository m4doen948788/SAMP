const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Backend/.env') });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const query = `
            SELECT u.id, u.username 
            FROM users u
            JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            WHERE pp.tipe_user_id = 1 
            LIMIT 1
        `;
        const [users] = await pool.query(query);
        if (users.length > 0) {
            const user = users[0];
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query("UPDATE users SET password = ? WHERE id = ?", [hash, user.id]);
            console.log(`User ${user.username} (ID: ${user.id}) password updated to: admin123`);
        } else {
            console.log('No super admin found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
