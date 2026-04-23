const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit User Andin ---");
        const [user] = await pool.query('SELECT * FROM users WHERE username = "andin"');
        console.log("USER ANDIN:", JSON.stringify(user, null, 2));

        if (user.length > 0) {
            const [profil] = await pool.query('SELECT * FROM profil_pegawai WHERE id = ?', [user[0].profil_pegawai_id]);
            console.log("PROFIL ANDIN:", JSON.stringify(profil, null, 2));
        } else {
            console.log("User 'andin' tidak ditemukan.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
