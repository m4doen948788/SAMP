const pool = require('./src/config/db');

async function run() {
    try {
        console.log("--- Audit Detail Profil & Users ---");
        const [user] = await pool.query('SELECT * FROM users WHERE username = "superadmin"');
        console.log("USER FULL:", JSON.stringify(user, null, 2));

        const [profil] = await pool.query('SELECT * FROM profil_pegawai WHERE id = 2');
        console.log("PROFIL 2:", JSON.stringify(profil, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
