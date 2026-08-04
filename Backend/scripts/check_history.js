const pool = require('../src/config/db');

async function run() {
  try {
    console.log("--- MIGRATION HISTORY ---");
    const [history] = await pool.query("SELECT * FROM migration_history ORDER BY executed_at DESC");
    console.table(history);

    console.log("--- TABLES IN DATABASE ---");
    const [tables] = await pool.query("SHOW TABLES");
    console.log(tables.map(t => Object.values(t)[0]));

    console.log("--- COLUMNS IN master_aplikasi_external ---");
    const [cols] = await pool.query("SHOW COLUMNS FROM master_aplikasi_external");
    console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
