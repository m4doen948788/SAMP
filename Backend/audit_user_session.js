const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Riwayat Chat & User ID ---");
        const [users] = await pool.query('SELECT id, username, profil_pegawai_id FROM users WHERE username = "Superadmin"');
        console.log("USER:", JSON.stringify(users, null, 2));

        if (users.length > 0) {
            const [history] = await pool.query('SELECT * FROM nayaxa_chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [users[0].id]);
            console.log("HISTORY:", JSON.stringify(history, null, 2));
            
            const [pegawai] = await pool.query('SELECT instansi_id FROM profil_pegawai WHERE id = ?', [users[0].profil_pegawai_id]);
            console.log("INSTANSI_ID PEGAWAI:", JSON.stringify(pegawai, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
