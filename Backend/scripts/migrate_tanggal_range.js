const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log("Adding tanggal_akhir column to kegiatan_manajemen...");
        await pool.query("ALTER TABLE kegiatan_manajemen ADD COLUMN tanggal_akhir DATE AFTER tanggal");
        console.log("Migration successful.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
