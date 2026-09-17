const pool = require('../src/config/db');

async function check() {
    try {
        const [tables] = await pool.query("SHOW TABLES LIKE '%skp%'");
        console.log('Tables matching skp:', tables);

        for (const t of tables) {
            const tableName = Object.values(t)[0];
            const [schema] = await pool.query(`DESCRIBE \`${tableName}\``);
            console.log(`\nSCHEMA FOR ${tableName}:`);
            console.table(schema);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
