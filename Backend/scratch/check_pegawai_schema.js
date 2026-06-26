const pool = require('../src/config/db');

async function check() {
    try {
        const [schema] = await pool.query(`DESCRIBE \`profil_pegawai\``);
        console.log(`SCHEMA FOR profil_pegawai:`);
        console.table(schema);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
